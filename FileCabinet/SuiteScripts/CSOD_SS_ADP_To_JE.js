
define(['N/file', 'N/render'], function (file, render) {

    /**
     * Module Description...
     *
     * @exports XXX
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

    }

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

            if(logEnable) {
                log.debug({
                    title: "tempObj",
                    details: tempObj
                });
            }

            output.push(tempObj);

            return true;
        });

        return output;
    };

    exports.execute = execute;
    return exports;
});
