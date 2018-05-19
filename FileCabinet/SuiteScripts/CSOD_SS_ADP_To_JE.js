
define(['N/file', 'N/record', 'N/render', 'N/search', 
        './Lib/lodash', './Lib/CSOD_ADP_Lib_Ref', './Lib/CSOD_ADP_Common_Func',
        './Lib/CSOD_ADP_Israel_Process'],
    function (file, record, render, search, _, LIB, COMMON_FUNC, IL) {

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

    /**
     * Create Object like this for every line (SVE)
     * {
         *
         *      department: '1234',
         *      paycode: 220,
         *      debit_account: 61160,
         *      credit_account: 22950,
         *      amount: 3028.08
         * }
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

    // Credit Department
    const creditDepartment = '12';

    // Accrued ESPP Withholdings ID (negative debit)
    const ACC_ESPP_WITHHOLDING = '1604';

    // global value initialization

    var GLOBAL_COUNTRY_SPECIFIC = {
        location: '',
        subsidiary: '',
        currency: '',
        countryCode: ''
    };

    // Entry Point
    function execute(context) {

        // TODO open and read Excel File
        var csvFile = file.load({
            id: 2826201
        });

        var dataInObject = getDataObject(csvFile);

        var paycodeAccountObj = COMMON_FUNC.getPaycodeToAccountTable();

        var dataWithAccount = COMMON_FUNC.searchAndFillAccountId(dataInObject, paycodeAccountObj);

        var dataWithDepartment = COMMON_FUNC.searchAndFillDepartmentId(dataWithAccount);

        // get unique Debit Accounts / Credit Accounts / Departments
        var debitAccounts = COMMON_FUNC.getUniqueDebitNumbers(dataWithDepartment);
        log.debug({
            title: 'Unique Debits',
            details: debitAccounts
        });

        var creditAccounts;

        if(GLOBAL_COUNTRY_SPECIFIC.countryCode == 'FR') {
            creditAccounts = COMMON_FUNC.getUniqueCreditNumbers(dataWithDepartment, ACC_ESPP_WITHHOLDING);
        } else {
            creditAccounts = COMMON_FUNC.getUniqueCreditNumbers(dataWithDepartment);
        }
        log.debug({
            title: 'Unique Credits',
            details: creditAccounts
        });

        log.debug({
            title: 'Unique Credits',
            details: creditAccounts
        });
        var departments = COMMON_FUNC.getUniqueDepartments(dataWithDepartment);
        log.debug({
            title: 'Unique Departments',
            details: departments
        });

        switch(GLOBAL_COUNTRY_SPECIFIC.countryCode) {
            case 'FR':
                // FRANCE
                log.debug('Processing France');
                createJournalEntry(dataWithDepartment, debitAccounts, creditAccounts, departments, GLOBAL_COUNTRY_SPECIFIC);
                break;

            case 'IL':
                // ISRAEL
                log.debug('Processing Israel');
                IL.createIsraelJournal(dataWithDepartment, debitAccounts, creditAccounts, departments, GLOBAL_COUNTRY_SPECIFIC);
                break;

            default:
                createJournalEntry(dataWithDepartment, debitAccounts, creditAccounts, departments, GLOBAL_COUNTRY_SPECIFIC);
                break;

        }
    }

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
                var trimmedCountryCode = arr[1].trim();
                GLOBAL_COUNTRY_SPECIFIC.countryCode = trimmedCountryCode;
                GLOBAL_COUNTRY_SPECIFIC.location = LIB.location[trimmedCountryCode];
                GLOBAL_COUNTRY_SPECIFIC.subsidiary = LIB.subsidiary[trimmedCountryCode];
                GLOBAL_COUNTRY_SPECIFIC.currency = LIB.currency[trimmedCountryCode];

                log.debug({
                    title: "Country Code",
                    details: GLOBAL_COUNTRY_SPECIFIC.countryCode
                });
            }

            // set tempObj values
            // we are only interested in lines with Column 1(employee ID) and 5(Paycode)
            if(arr[0].indexOf('105097') > -1 || arr[0] == '105097') {
                log.audit({
                    title: "105097 debug",
                    details: arr[0] + ", " + arr[4]
                });
            }

            if(!isNaN(parseInt(arr[0])) && !isNaN(parseInt(arr[4]))) {
                var employeeIdStr = arr[0];


                // substring for employee id format
                if(employeeIdStr.length == 8 && employeeIdStr.substring(0,2) == "00") {
                    employeeIdStr = employeeIdStr.substring(2, employeeIdStr.length)
                }
                tempObj.employee_id = employeeIdStr.trim();
                tempObj.paycode = arr[4].trim();
                tempObj.amount = parseFloat(arr[6]);

            }

            if(LIB.logEnable && employeeIdStr == '105097') {
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


    var createJournalEntry = function(data, debitAccts, creditAccts, depts, global_obj) {

        // Get Header Level Obj

        log.debug({
            title: 'GLOBAL_COUNTRY_SPECIFIC check',
            details: GLOBAL_COUNTRY_SPECIFIC
        });
        var jeObj = new LIB.JE_HeaderFields(global_obj.subsidiary, global_obj.currency, global_obj.location);


        // Write Debit Line
        for(var x = 0; x < depts.length; x++) {
            // if department is not empty string
            var dept = depts[x];

            //log.audit('Processing ' + dept);

            if(dept) {
                // for every debit accounts
                for(var y = 0; y < debitAccts.length; y++) {

                    var debitAcct = debitAccts[y];

                    // skip rest of process for debit side credit
                    if(creditAccts.indexOf(debitAcct) > -1) {
                        //log.audit('Skipping ' + debitAcct + ' for debit');
                        continue;
                    }

                    // if debit account is not empty string
                    if(debitAcct) {
                        // create entry line
                        var debitLineObj = {
                            account: debitAcct,
                            debit: 0,
                            credit:0,
                            department: dept,
                            location: ''
                        };

                        // go through each data
                        for(var z = 0; z < data.length; z++) {

                            var obj = data[z];
                            if(obj.department == dept && obj.debit_account == debitAcct) {

                                if(parseFloat(obj.amount)) {
                                    if(dept == '209') log.audit('adding ' + obj.amount  + ' for debit');
                                    debitLineObj.debit += parseFloat(obj.amount);
                                }

                            }
                        }
                        if(debitLineObj.debit) {
                            if(dept == '209') {
                                log.audit({
                                    title: "Pusing dept 209",
                                    details: debitLineObj
                                })
                            }
                            jeObj.lines.push(debitLineObj);
                        }
                    }

                }
            }
        } // End of Department Loop

        // collect credit lines
        for(var cr = 0; cr < creditAccts.length; cr++) {
            var credit = creditAccts[cr];
            var creditLineObj = {
                account: credit,
                debit: 0,
                credit:0,
                department: creditDepartment,
                location: ''
            };
            if(credit) {
            	
            	//log.audit("Processing " + credit);

                data.forEach(function(o) {
                	// collect credit amount from debit_amount
                    // 21395(1604), 62120(345), 21380(280), 22950(489)
                	
                	if(credit == ACC_ESPP_WITHHOLDING && GLOBAL_COUNTRY_SPECIFIC.countryCode == 'FR') {
                		if(o.debit_account == ACC_ESPP_WITHHOLDING && parseFloat(o.amount) != 0) {
                			creditLineObj.credit += parseFloat(o.amount);
                		}
                	} else if(credit == '345') {
                	    // @TODO This is always double posting
                		if(o.debit_account == '345' && parseFloat(o.amount) != 0) {
                			creditLineObj.credit += parseFloat(o.amount);
                		}
                	} else {
                    	
                    	if(o.credit_account == credit && parseFloat(o.amount)) {
                    		//log.audit(credit + " processing now for " + o.amount);
                    		creditLineObj.credit += parseFloat(o.amount);
                    	}
                    	if(o.debit_account == credit && parseFloat(o.amount)) {
                    		//log.audit(credit + " processing now for " + o.amount);
                    		creditLineObj.credit -= parseFloat(o.amount);
                    	}
                	}   
                    
                });
                
                log.debug({
            		title: 'pushing creditLineObj',
            		details: creditLineObj
            	});

                // credit 62120 needs double posting
                if(credit == '345') {
                    jeObj.lines.push(creditLineObj);
                }

                // push to creditLineObj
                if(creditLineObj.credit >= 0) {
                	
                    jeObj.lines.push(creditLineObj);
                } else if(creditLineObj.credit < 0) {
                    // convert to positive
                    creditLineObj.credit = -creditLineObj.credit;
                    jeObj.lines.push(creditLineObj);
                }
            }
        } // end of credit accounts loop

        log.debug({
            title: "entry credit lines check",
            details: jeObj.lines.slice(jeObj.lines.length - 5, jeObj.lines.length)
        });

        var newJeId =  COMMON_FUNC.writeJournalEntry(jeObj);

        log.debug({
            title: 'new journal created',
            details: 'id : ' + newJeId
        });

    };

    exports.execute = execute;
    return exports;
});
