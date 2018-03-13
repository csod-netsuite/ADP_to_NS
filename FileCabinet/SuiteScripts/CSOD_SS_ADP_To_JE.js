
define(['N/file', 'N/record', 'N/render', 'N/search', './Lib/lodash', './Lib/CSOD_Lib_Ref'],
    function (file, record, render, search, _, Lib) {

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
    var location = '';
    var subsidiary = '';
    var currency = '';


    // Entry Point
    function execute(context) {

        // TODO open and read Excel File
        var csvFile = file.load({
            id: 2799072
        });

        var objectifiedData = getDataObject(csvFile);

        var paycodeAccountObj = getPaycodeToAccountTable();

        var dataWithAccount = fillAccountId(objectifiedData, paycodeAccountObj);

        // Get Employee Data with Department
        var dataWithDepartment = fillDepartmentId(dataWithAccount);

        // get unique Debit and Credit Account
        var debitAccounts = getUniqueDebitNumbers(dataWithDepartment);
        log.debug({
            title: 'Unique Debits',
            details: debitAccounts
        });
        var creditAccounts = getUniqueCreditNumbers(dataWithDepartment);
        log.debug({
            title: 'Unique Credits',
            details: creditAccounts
        });

        // get unique Department
        var departments = getUniqueDepartments(dataWithDepartment);
        log.debug({
            title: 'Unique Departments',
            details: departments
        });

        if(!logEnable) {
            log.debug({
                title: 'dataWithAccount',
                details: dataWithAccount
            });
        }

        createJournalEntry(dataWithDepartment, debitAccounts, creditAccounts, departments);
    }

    var createJournalEntry = function(data, debitAccts, creditAccts, depts) {

        // Get Header Level Obj
        var jeObj = new Lib.JE_HeaderFields(subsidiary, currency, location);


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
                	
                	if(credit == ACC_ESPP_WITHHOLDING) {
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

        var newJeId =  writeJournalEntry(jeObj);

        log.debug({
            title: 'new journal created',
            details: 'id : ' + newJeId
        });

    };

    var writeJournalEntry = function(jeObj) {

        try {

            log.debug({
                title: 'JE Entry',
                details: jeObj
            });

            var newJournal = record.create({
                type: record.Type.JOURNAL_ENTRY,
                isDynamic: true,
                defaultValues: {
                    customForm: jeObj.customForm
                }
            });
            // Set Header Level Values
            newJournal.setValue({
                fieldId: 'subsidiary',
                value: jeObj.subsidiary
            });
            newJournal.setValue({
                fieldId: 'custbodycash_use_category',
                value: jeObj.custbodycash_use_category
            });
            newJournal.setValue({
                fieldId: 'currency',
                value: jeObj.currency
            });
            newJournal.setValue({
                fieldId: 'approved',
                value: jeObj.approved
            });

            // Set Line Level Values
            var lineLength = jeObj.lines.length;
            var balanceCheckDebit = 0;
            var balanceCheckCredit = 0;

            if (lineLength > 0) {
                for (var i = 0; i < lineLength; i++) {

                    newJournal.selectNewLine({
                        sublistId: 'line'
                    });

                    var lineObj = jeObj.lines[i];
                    var debitAmount = lineObj.debit;
                    var creditAmount = lineObj.credit;

                    // set account
                    newJournal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: lineObj.account
                    });

                    // set department
                    newJournal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'department',
                        value: lineObj.department
                    });

                    // set location
                    newJournal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'location',
                        value: lineObj.location
                    });

                    // set debit or credit

                    if (debitAmount) {

                        balanceCheckDebit += debitAmount;

                        newJournal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'debit',
                            value: debitAmount.toFixed(2)
                        });
                    }
                    if(creditAmount) {

                        balanceCheckCredit += creditAmount;
                        newJournal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'credit',
                            value: creditAmount.toFixed(2)
                        });
                    }

                    newJournal.commitLine({
                        sublistId: 'line'
                    });

                } // end loop
            }

            // check balance in log
            log.audit({
               title: 'Balance Check in writeJournalEntry',
               details: 'Credit = ' + balanceCheckCredit + ', Debit = ' + balanceCheckDebit
            });

            // submit new record

            var newJournalId = newJournal.save({
                ignoreMandatoryFields: true
            });

            return newJournalId;

        } catch(e) {
            log.error({
                title: 'Error Has Occurred',
                details: e
            });
        }

    };

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

    var getUniqueDebitNumbers = function(data) {
        var allDebitAccts = [];
        data.forEach(function(o) {
            allDebitAccts.push(o.debit_account);
        });

        return _.uniq(allDebitAccts);
    };

    var getUniqueCreditNumbers = function(data) {
        var allCreditAccts = [];
        data.forEach(function(o){
            allCreditAccts.push(o.credit_account);
        });

        // Manually Adding Account 21395 (ACC_ESPP_WITHHOLDING)
        allCreditAccts.push(ACC_ESPP_WITHHOLDING);

        return _.uniq(allCreditAccts);
    };

    var getUniqueDepartments = function(data) {
        var allDepts = [];
        data.forEach(function(o){
            allDepts.push(o.department);
        });

        return _.uniq(allDepts);
    };

    /**
     * Find department for each data in collection
     * @param data
     * @returns {collection}data
     */
    var fillDepartmentId = function(data) {

        // get all employee ID
        var allEmployeeIds = [];
        data.forEach(function(obj) {
            allEmployeeIds.push(obj.employee_id);
        });

        var uniqueEmployeeIds = _.uniq(allEmployeeIds);

        log.debug({
            title: 'Unique Employee IDs',
            details: uniqueEmployeeIds
        });

        // search Department Data and build Employee to Department Reference Table

        var employeeToDepartmentReferences = [];

        var employeeSearchObj = search.create({
            type: "employee",
            filters: [
                ["externalid","anyof",uniqueEmployeeIds],
                "AND",
                ["isinactive", "any", ""]
            ],
            columns: [
                "externalid",
                "department"
            ]
        });

        var searchResultCount = employeeSearchObj.runPaged().count;
        if(searchResultCount > 0) {
            employeeSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results
                var employeeToDepartmentReference = {
                    employee_id : '',
                    department_id : ''
                };

                employeeToDepartmentReference.employee_id = result.getValue({name: 'externalid'});
                employeeToDepartmentReference.department_id = result.getValue({name: 'department'});
                employeeToDepartmentReferences.push(employeeToDepartmentReference);
                return true;
            });
        }


        if(logEnable) {

            log.debug({
                title: 'Employee to Department Lookups',
                details: employeeToDepartmentReferences
            });
        }

        data.forEach(function(obj) {

            var foundRef = _.find(employeeToDepartmentReferences, {'employee_id': obj.employee_id});

            if(foundRef) {
                obj.department = foundRef.department_id;
                //log.audit("foundRef department: " + foundRef.department_id + " for employee: " + foundRef.employee_id);
            }
        });

        if(logEnable) {
            var dataCheckArr = [];
            data.forEach(function(o) {
                if(o.department == '209') {
                    dataCheckArr.push(o);
                }
            });
            log.debug({
                title: 'Data with Department 209',
                details: dataCheckArr
            });
        }

        return data;
    };

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

            if(logEnable) {
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
