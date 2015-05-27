cg_model是一个用来同步更新db和cache数据的模块，目前db支持mysql（即时写、缓写、分库写），cache支持redis。

## 一. 基本概念

当一个对象的数据发生变化后，需要更新至db和cache中，这时就涉及到了数据同步问题。


## 二. 配置选项

## 三. 成员函数

* create

* load

* update

* remove

## 四. 静态函数 

* find

* findAll

* remove

* removeAll

* count

* countAll

## 五. 分库分表

举例来说明使用的方法：
1、使用如下sql创建5个数据库
test
test_shard_00
test_shard_01
test_shard_02
test_shard_03
其中test为主库，其他的test_shard_xx为分库。

```
DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `userId` int(11) unsigned NOT NULL ,
  `money` int(10) unsigned NOT NULL,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `userId`;

CREATE TABLE `userId` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DELIMITER ;;

# Dump of PROCEDURE gen_userId
# ------------------------------------------------------------

/*!50003 DROP PROCEDURE IF EXISTS `gen_userId` */;;
/*!50003 CREATE*/ /*!50003 PROCEDURE `gen_userId`(IN count INT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM userId LIMIT 1) THEN
    INSERT INTO userId (id) VALUES(1);
  END IF;

  UPDATE userId SET id = LAST_INSERT_ID(id)+count;
    SELECT LAST_INSERT_ID() AS id;
END */;;

DELIMITER ;
```

2、添加mysql.json，内容如下：
```
{
  "test_main": {
    "connectionLimit": 10,
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "123456",
    "multipleStatements": true
  },
  "test_0": {
    "connectionLimit": 10,
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "123456",
    "multipleStatements": true
  },
  "test_1": {
    "connectionLimit": 10,
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "123456",
    "multipleStatements": true
  }
}
```

3、添加cg_model.json，内容如下：
```
{
    "mysql_shard": {
        "cron": "*/30 * * * * *",
        "batchCount": 100, 
        "shard_count": 4,
        "database": {
            "test": {
                "main_db": "test",
                "shard_db_format": "test_shard_%02d",
                "connection": {
                    "test_main": [
                        "test"
                    ],
                    "test_0": [
                        "test_shard_00",
                        "test_shard_01"
                    ],
                    "test_1": [
                        "test_shard_02",
                        "test_shard_03"
                    ]
                }
            }
        }
    }
}
```
batchCount：批量查询的数量。
shard_count：分库数量。
database：配置分库对应的mysql连接，其中connection中的key对应mysql.json中的连接配置，value是一个数组，存放一个或多个分库名。

4、创建一个model.js，文件中定义了要使用的model：
```
'use strict';
var CGModel = require('cg_model');

//用于创建userId
var genUserId = function(cb) {
  var dbName = this.db.getMainDBName();
  var sql = 'CALL `' + dbName + '`.`gen_userId`(1);';
  var conn = CGModel.getMysqlShardDBConn(dbName);
  conn.query(sql, [], function(err, res) {
    if (!!err) {
      cb(err);
      return;
    }
    cb(null, res[0][0].id);
  });
}

CGModel.createModel({
  name: 'User',          //用于获取model的名称

  //字段应与数据库的table或view的列名对应起来
  props: {
    userId:             { type: 'number', primary: true, defaultValue: genUserId, shard: true },
    money:              { type: 'number', defaultValue: 0, },
  },

  db: {
    type: 'mysql_shard',                //读取cg_model.json中的对应配置
    db_name: 'test',                    //读取cg_model.json中的对应配置
    tbl_name: 'user',                   //指定mysql中的table或view的名称
  },
  //我们暂时不关心cache
  cache: {
    type: 'none' 
  },
});
```

5、添加app.js文件：
```
'use strict';

var mysql = require('mysql');
var redis = require('redis');
var async = require('async');
var CGModel = require('cg_model');

//设定mysql的连接
var key, config, client;
var mysqlConfig = require('./mysql.json');
for (key in mysqlConfig) {
  config = mysqlConfig[key];
  client = mysql.createPool(config);
  CGModel.setDBClient(key, client);
}

//初始化配置
CGModel.initialize(require('./cg_model.json'));
//定义model
require('./model.js')

CGModel.start();

var User = CGModel.getModel('User');
async.timesSeries(100, function(idx, cb) {
  var user = new User();
  user.create(cb);
}, function(err) {
  if (err) {
    console.error(err)
  } else {
    console.log('done');
  }

  CGModel.stop(function(err) {
    process.exit(0);
  });
});
```

6、运行node app.js后，可以看到4个分库中都有了数据。

## 六. 建立View来处理数据库字段之间比较
cg_model的查询能力有限，当涉及到的sql语句较为繁琐时，可以采用建立数据库View的方式来解决。

## 七. 建立有过期时间的缓存
cache的type设置为redis_ttl，增加一个expire字段，用于表示缓存生存期，单位为毫秒。

## 八. 创建只读model

```
var UserModel =  CGModel.getModel('User');
var user = new UserModel(null, {readonly: true});
user.load(callback);

//过一段时间后，需要重新同步数据
user.forceLoad(callback);
```

## 九. 创建自定义的分库路由规则
自定义的路由函数函数会绑定到model.db.getShardIndex上。
针对某个model的路由规则优先级最高，其次是全局路由规则，最后是默认路由规则。
```
//全局的路由规则
CGModel.set('shard_strategy', function () {
  return this.getShardValue() % this.shardCount; 
});

//针对某个model的路由规则
var shardStrategy = function () {
  return this.getShardValue() % this.shardCount;
}

CGModel.createModel({
  name: 'UserUseCustomShardStrategy',

  props: {
    userId:             { type: 'number', primary: true, shard: true },
  },

  db: {
    type: 'mysql_shard',
    db_name: 'test',
    tbl_name: 'user',
    shard_strategy: shardStrategy,
  },

  cache: {
    type: 'none',
  },
});

```
