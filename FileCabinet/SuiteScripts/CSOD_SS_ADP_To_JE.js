
define(['N/file', 'N/render', 'N/search'], function (file, render, search) {

    /**
     * Module Description...
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan Yi  cyi@csod.com
     *
     * @NApiVersion 2.x
     * @NModuleScope Public
     * @NScriptType ScheduledScript
     */

    var exports = {};

    /**
     * <code>execute</code> event handler
     *
     * @governance 10,000
     *
     * @param context
     *        {Object}
     * @param context.type
     *        {InvocationTypes} Enumeration that holds the string values for
     *            scheduled script execution contexts
     *
     * @return {void}
     *
     * @static
     * @function execute
     */

    // Settings for the script
    const logEnable = true;

    // Entry Point
    function execute(context) {

        // TODO open and read Excel File
        var csvFile = file.load({
            id: 2488600
        });

        var objectifiedData = getDataObject(csvFile);

        var paycodeAccountObj = getPaycodeToAccountTable();

        var dataWithAccount = fillAccountId(objectifiedData, paycodeAccountObj);

        // get unique Debit and Credit Account
        var accountNumbers = getUniqueAccountNumber(objectifiedData);

        if(logEnable) {
            log.debug({
                title: 'dataWithAccount',
                details: dataWithAccount
            });
        }
    }

    /**
     * Find account ids and set the account id to data object
     * @param data {array}
     * @param paycodeObj {array}
     * @returns {array} data
     */
    var fillAccountId = function(data, paycodeObj) {

        for (var i = 0; i < data.length; i++) {

            var matchingObj = paycodeObj.filter(function(obj) {
                return data[i].paycode == obj.paycode;
            });

            if(matchingObj.length > 0) {
                data[i].debit_account = matchingObj[0].debitId;
                data[i].credit_account = matchingObj[0].creditId;
            }
        }
        return data;
    };

    /**
     * Search customrecord_csod_adp_paycode_table and build list of data in object
     * return {array}
     */
    var getPaycodeToAccountTable = function() {

        var outList = [];

        var customrecord_csod_adp_paycode_tableSearchObj = search.create({
            type: "customrecord_csod_adp_paycode_table",
            filters:[],
        columns: [
            "custrecord_csod_adp_paycode",
            "custrecord_csod_adp_cr_gl_account",
            "custrecord_csod_adp_dr_gl_account"
        ]
    });
        var searchResultCount = customrecord_csod_adp_paycode_tableSearchObj.runPaged().count;
        if(searchResultCount > 0) {
            customrecord_csod_adp_paycode_tableSearchObj.run().each(function(result){
                var tempObj = {
                    paycode: '',
                    debitId: '',
                    creditId: ''
                };
                // .run().each has a limit of 4,000 results
                tempObj.paycode = result.getValue({name: 'custrecord_csod_adp_paycode'});
                tempObj.debitId = result.getValue({name: 'custrecord_csod_adp_dr_gl_account'});
                tempObj.creditId = result.getValue({name: 'custrecord_csod_adp_cr_gl_account'});

                outList.push(tempObj);

                return true;
            });
        }

        return outList;
    };

    var getUniqueAccountNumber = function(data) {

    };

    /**
     * Iterate CSV file lines and collect information
     * @param csvFile
     * @returns {Array}
     */
    var getDataObject = function(csvFile) {

        /**
         * TODO Create Object like this for every line (SVE)
         * {
         *      department: '1234',
         *      paycode: 220,
         *      debit_account: 61160,
         *      credit_account: 22950,
         *      amount: 3028.08
         * }
         */
        var output = [];

        var iterator = csvFile.lines.iterator();

        // skip
        iterator.each(function(line) {

            var tempObj = {
                department: "",
                paycode: "",
                debit_account: "",
                credit_account: "",
                amount: 0
            };

            var arr = line.value.split(',');

            log.debug({
                title: "Employee ID",
                details: arr[0]
            });

            // get contrycode
            if(arr[0].toLowerCase() == 'country code') {
                var countryCode = arr[1];
                log.debug({
                    title: "Country Code",
                    details: countryCode
                });
            }

            // set tempObj values
            if(!isNaN(parseInt(arr[0])) && !isNaN(parseInt(arr[4]))) {

                tempObj.paycode = arr[4];
                tempObj.amount = parseFloat(arr[6]);
            }

            if(!logEnable) {
                log.debug({
                    title: "tempObj",
                    details: tempObj
                });
            }
            if(tempObj.paycode) {
                output.push(tempObj);
            }

            return true;
        });

        return output;
    };

    exports.execute = execute;
    return exports;
});
