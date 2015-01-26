'use strict';
var assert = require('assert');
var CGModel = require('../lib');

describe('Lib', function() {
	beforeEach(function() {
		CGModel.clearSettings();
	});

	describe('initMysqlShardDBConn', function() {

		it('should init success when shard_count is undefined and use default connection setting', function() {
			var conn = 'main_db';
			CGModel.setDBClient('test', conn);
			CGModel.initMysqlShardDBConn({
				database: {
					test: {
						main_db: 'test'
					}
				}
			});

			assert.equal(CGModel.getMysqlShardDBConn('test'), conn);
		});


		it('should init success when shard_count is 0 and use default connection setting', function() {
			var conn = 'main_db';
			CGModel.setDBClient('test', conn);
			CGModel.initMysqlShardDBConn({
				shard_count: 0,
				database: {
					test: {
						main_db: 'test'
					}
				}
			});

			assert.equal(CGModel.getMysqlShardDBConn('test'), conn);
		});

		it('should init success when shard_count is 0 and specified the main db connection', function() {
			var conn = 'main_db';
			CGModel.setDBClient('test_main_db_conn', conn);
			CGModel.initMysqlShardDBConn({
				shard_count: 0,
				database: {
					test: {
						main_db: 'test',
						connection: {
							test_main_db_conn: ['test']
						}
					}
				}
			});

			assert.equal(CGModel.getMysqlShardDBConn('test'), conn);
		});

		it('should init success when shard_count is 2 and use default connection setting', function() {

			CGModel.setDBClient('test', 'main_db');
			CGModel.setDBClient('test_shard_00', 'shard_db_00');
			CGModel.setDBClient('test_shard_01', 'shard_db_01');
			CGModel.initMysqlShardDBConn({
				shard_count: 2,
				database: {
					test: {
						main_db: 'test',
						shard_db_format: 'test_shard_%02d'
					}
				}
			});

			assert.equal(CGModel.getMysqlShardDBConn('test'), 'main_db');
			assert.equal(CGModel.getMysqlShardDBConn('test_shard_00'), 'shard_db_00');
			assert.equal(CGModel.getMysqlShardDBConn('test_shard_01'), 'shard_db_01');
		});

		it('should init success when shard_count is 2 and specified connections', function() {

			CGModel.setDBClient('test_conn', 'conn0');
			CGModel.setDBClient('test_conn_shard_00', 'conn1');
			CGModel.setDBClient('test_conn_shard_01', 'conn2');
			CGModel.initMysqlShardDBConn({
				shard_count: 2,
				database: {
					test: {
						main_db: 'test',
						shard_db_format: 'test_shard_%02d',
						connection: {
							test_conn_shard_01: [
								'test',
								'test_shard_00',
							],
							test_conn_shard_00: [
								'test_shard_01',
							],
						}
					}
				}
			});

			assert.equal(CGModel.getMysqlShardDBConn('test'), 'conn2');
			assert.equal(CGModel.getMysqlShardDBConn('test_shard_00'), 'conn2');
			assert.equal(CGModel.getMysqlShardDBConn('test_shard_01'), 'conn1');
		});

		it('should init fail when the main_db is undefined', function() {
			var conn = 'main_db';
			CGModel.setDBClient('test', conn);

			assert.throws(function() {

				CGModel.initMysqlShardDBConn({
					database: {
						test: {}
					}
				});
			});
		});

		it('should init fail when shard_count is not zero but the shard_db_format is undefined', function() {
			var conn = 'main_db';
			CGModel.setDBClient('test', conn);

			assert.throws(function() {

				CGModel.initMysqlShardDBConn({
					shard_count: 2,
					database: {
						test: {
							main_db: 'test',
							connection: {
								test_conn_shard_01: [
									'test',
									'test_shard_00',
								],
								test_conn_shard_00: [
									'test_shard_01',
								],
							}
						}
					}
				});
			});
		});

		it('should init fail when shard_count is not 0 but the specified connection is inexistsent', function() {
			var conn = 'main_db';
			CGModel.setDBClient('test', conn);

			assert.throws(function() {

				CGModel.initMysqlShardDBConn({
					shard_count: 2,
					database: {
						test: {
							main_db: 'test',
							shard_db_format: 'test_shard_%02d',
							connection: {
								test_conn_shard_01: [
									'test',
									'test_shard_00',
								],
								test_conn_shard_00: [
									'test_shard_01',
								],
							}
						}
					}
				});
			});
		});

		it('should init fail when shard_count is 0 but the specified connection is inexistsent', function() {
			var conn = 'main_db';
			CGModel.setDBClient('test', conn);

			assert.throws(function() {

				CGModel.initMysqlShardDBConn({
					database: {
						test: {
							main_db: 'test',
							shard_db_format: 'test_shard_%02d',
							connection: {
								test_conn_shard_01: [
									'test',
									'test_shard_00',
								],
								test_conn_shard_00: [
									'test_shard_01',
								],
							}
						}
					}
				});
			});
		});

		it('should init fail when shard_count is 0 and the connection is undefined but the specified connection is inexistsent', function() {
			var conn = 'main_db';
			CGModel.setDBClient('test0', conn);

			assert.throws(function() {

				CGModel.initMysqlShardDBConn({
					database: {
						test: {
							main_db: 'test',
						}
					}
				});
			});
		});
	});
});