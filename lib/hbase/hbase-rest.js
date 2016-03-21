var Promise   = require('bluebird');
var HBaseRest = require('hbase');
var Logger    = require('../logger');

var tables = {
  ledgers: [
    'ledgers',
    'transactions',
    'exchanges',
    'payments',
    'balance_changes',
    'account_exchanges',
    'account_offers',
    'account_payments',
    'accounts_created',
    'memos',
    'lu_ledgers_by_index',
    'lu_ledgers_by_time',
    'lu_transactions_by_time',
    'lu_account_transactions',
    'lu_affected_account_transactions',
    'lu_account_offers_by_sequence',
    'lu_account_memos',
    'agg_payments',
    'agg_exchanges',
    'agg_metrics',
    'agg_stats',
    'agg_account_stats',
    'agg_account_balance_changes',
    'agg_account_payments',
    'agg_account_exchanges',
    'top_markets',
    'top_currencies',
    'issuer_balance_snapshot',
    'control'
  ],
  validations: [
    'validations_by_ledger',
    'validations_by_validator',
    'validations_by_date',
    'validators_by_reporter',
    'validator_reports',
    'cluster_ledgers'
  ]
};


var Client = function (options) {
  var prefix = options.prefix || '';
  var rest   = new HBaseRest(options);
  var log    = new Logger({
    scope : 'hbase-rest',
    level : options.logLevel || 0,
    file  : options.logFile
  });

  /**
   * initTables
   * create tables and column families
   * if they do not exits
   */

  this.initTables = function (group, done) {

    Promise.map(tables[group], function(table) {
      return addTable(table, group === 'validations');
    })
    .nodeify(function(err, resp) {

      if (err) {
        log.error('Error configuring tables:', err);
      } else {
        log.info('tables configured');
      }

      if (done) {
        done(err, resp);
      }
    });
  }

  this.removeTables = function (group, done) {
     Promise.map(tables[group], function(table) {
      return removeTable(table);
    })
    .nodeify(function(err, resp) {

      if (err) {
        log.error('Error removing tables:', err);
      } else {
        log.info('tables removed');
      }

      if (done) {
        done(err, resp);
      }
    });
  }

  /**
   * addTable
   * add a new table to HBase
   */

  function addTable (table, includeIncrement) {
    var families = ['f','d'];

    if (table === 'agg_stats' || table === 'agg_account_stats') {
      families.push.apply(families, ['type','result','metric']);
    }

    if (includeIncrement) {
      families.push('inc');
    }

    return new Promise (function(resolve, reject) {
      var schema = [];
      families.forEach(function(family) {
        schema.push({name : family});
      });

      rest.table(prefix + table)
      .create({ColumnSchema : schema}, function(err, resp) {
        log.info(prefix + table, err, resp);
        if (err) {
          reject(err);
        } else {
          resolve(resp);
        }
      });
    });
  }

  /**
   * removeTable
   * remove a table from HBase
   */

  function removeTable (table) {
    return new Promise (function(resolve, reject) {
      rest.table(prefix + table)
      .delete(function(err, resp) {
        log.info(prefix + table, err, resp);
        if (err) {
          reject(err);
        } else {
          resolve(resp);
        }
      });
    });
  }
};

module.exports = function (options) {
  return new Client(options);
}
