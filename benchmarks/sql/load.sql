
DROP TABLE IF EXISTS `LoadObject`;
CREATE TABLE `LoadObject` (
  `objId` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `property1` int(11) NOT NULL,
  `property2` varchar(32) NOT NULL DEFAULT '',
  PRIMARY KEY (`objId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

