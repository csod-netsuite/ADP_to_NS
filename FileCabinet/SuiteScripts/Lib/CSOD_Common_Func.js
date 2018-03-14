/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 * 
 */
define(['N/file', 'N/search', './CSOD_Lib_Ref'],
/**
 * Commonly used functions to parse and process ADP CSV Files
 * @copyright 2017 Cornerstone OnDemand
 * @author Chan Yi <cyi@csod.com>
 */
function(file, search, Lib) {
	
	var exports = {};
	
   
    /**
     * Iterate CSV file lines and collect information
     * @param csvFile
     * @returns {Array}
     */
    var getDataObject = function(csvFile) {

        var output = [];

        var iterator = csvFile.lines.iterator();

        // skip
        iterator.each(function(line) {

            var tempObj = {
                employee_id: null,
                department: "",
                paycode: "",
                debit_account: "",
                credit_account: "",
                amount: 0
            };

            var arr = line.value.split(',');

            // get contrycode
            if(arr[0].toLowerCase() == 'country code') {
                var countryCode = arr[1];
                location = Lib.location[countryCode];
                subsidiary = Lib.subsidiary[countryCode];
                currency = Lib.currency[countryCode];

                log.debug({
                    title: "Country Code",
                    details: countryCode
                });
            }

            // set tempObj values
            // we are only interested in lines with Column 1(employee ID) and 5(Paycode)  
            if(!isNaN(parseInt(arr[0])) && !isNaN(parseInt(arr[4]))) {
                var employeeIdStr = arr[0];
                // substring for employee id format
                if(employeeIdStr.length == 8 && employeeIdStr.substring(0,2) == "00") {
                    employeeIdStr = employeeIdStr.substring(2, employeeIdStr.length)
                }
                tempObj.employee_id = employeeIdStr;
                tempObj.paycode = arr[4];
                tempObj.amount = parseFloat(arr[6]);
            }

            if(Lib.logEnable) {
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
    
    
    exports.getDataObject = getDataObject;
    exports.getPaycodeToAccountTable = getPaycodeToAccountTable;
	
    return exports;
        
    
    
});
