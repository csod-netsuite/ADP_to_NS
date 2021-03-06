/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * 
 */
define(['N/file', 'N/search', 'N/record', 'N/error', './CSOD_ADP_Lib_Ref', './lodash'],
/**
 * Commonly used functions to parse and process ADP CSV Files
 * @copyright 2017 Cornerstone OnDemand
 * @author Chan Yi <cyi@csod.com>
 */
function(file, search, record, error, Lib, lodash) {

    var logEnable = Lib.logEnable;

	var exports = {};
    
    /**
     * Search customrecord_csod_adp_paycode_table and build list of data in object
     * return {array}
     */
    var getPaycodeToAccountTable = function(countryCode) {
    	
    	log.debug("countryCode in getPaycodeToAccountTable", countryCode);
    	
    	/**
    	 * IMPORTANTE!!  
    	 * UPDATE THESE LISTS AFTER NEW COUNTRY HAS BEEN ADDED BY ADMIN
    	 */
    	
    	const COUNTRYCODE_MAP = {
    		FR: 1,
    		IL: 2,
    		BE: 3,
    		NL: 4,
    		ES: 5,
    		CH: 6,
    		NO: 7,
    		AT: 8,
    		HK: 9,
    		SG: 10,
    		PL: 11,
    		AU: 12,
    		FIN: 13,
    		DE: 14,
    		IT: 15,
    		NZ: 16,
    		SE: 17,
    		UK: 18,
    		DK: 19,
    		IN: 20,
    		JP: 21
    	}

        var outList = [];

        var customrecord_csod_adp_paycode_tableSearchObj = search.create({
            type: "customrecord_csod_adp_paycode_table",
            filters:["custrecord_csod_adp_ctry_code","anyof",COUNTRYCODE_MAP[countryCode]],
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
                if(result.getValue({name: 'custrecord_csod_adp_dr_gl_account'}) && 
                		result.getValue({name: 'custrecord_csod_adp_cr_gl_account'})) {
                	tempObj.paycode = result.getValue({name: 'custrecord_csod_adp_paycode'});
                    tempObj.debitId = result.getValue({name: 'custrecord_csod_adp_dr_gl_account'});
                    tempObj.creditId = result.getValue({name: 'custrecord_csod_adp_cr_gl_account'});
                }
                

                outList.push(tempObj);

                return true;
            });
        }

        return outList;
    };

    /**
     * Find account ids and set the account id to data object
     * @param data {array}
     * @param paycodeObj {array}
     * @returns {array} data
     */
    var searchAndFillAccountId = function(data, paycodeObj) {
    	
    	log.debug("searchAndFillAccountId data", data);
    	
        var paycodes = lodash.map(paycodeObj, 'paycode');

        log.debug({
            title: "searchAndFillAccountId - paycodes",
            details: paycodes
        });

        //TODO: When paycode is not found in the system throw error and halt the process
        var PAYCODES_NOT_FOUND = [];

        for (var i = 0; i < data.length; i++) {

            if(paycodes.indexOf(data[i].paycode) == -1) {
                PAYCODES_NOT_FOUND.push(data[i].paycode);
            }

            var matchingObj = paycodeObj.filter(function(obj) {

                return data[i].paycode == obj.paycode;
            });

            if(matchingObj.length > 0) {
                data[i].debit_account = matchingObj[0].debitId;
                data[i].credit_account = matchingObj[0].creditId;
            }
        }

        log.audit({
            title: "PAYCODES_NOT_FOUND",
            details: PAYCODES_NOT_FOUND
        });

        return data;
    };

    /**
     * Find department for each data in collection array
     * @param data {object}
     * @returns {collection}data
     */
    var searchAndFillDepartmentId = function(data) {

        // get all employee ID
    	
    	log.debug('searchAndFillDepartmentId data length = ' +  data.length)
    	
    	if(data.length === 0) {
    		var errorObj = error.create({
    		    name: 'ERROR_EMPLOYEE_ID',
    		    message: 'Please check your CSV file.',
    		    notifyOff: true
    		});
    		
    		log.error({
    			title: errorObj.name + ' : function searchAndFillDepartmentId()',
    			details: errorObj.message	
    		});
    		
    		throw errorObj;
    	}
    	
    	var allLiabilityAccounts = getAllLiabilityAccounts();
    	
        var allEmployeeIds = [];
        data.forEach(function(obj) {
            allEmployeeIds.push(obj.employee_id);
        });

        var uniqueEmployeeIds = lodash.uniq(allEmployeeIds);

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
        	
        	if(allLiabilityAccounts.indexOf(obj.debit_account) > -1) {
        		obj.department = '12';
        	} else {
                var foundRef = lodash.find(employeeToDepartmentReferences, {'employee_id': obj.employee_id});

                if(foundRef) {
                    obj.department = foundRef.department_id;
                    //log.audit("foundRef department: " + foundRef.department_id + " for employee: " + foundRef.employee_id);
                }
        	}

	         log.audit({
	             title: 'each data value check',
	             details: obj
	         });
        });

        return data;
    };
    
    
    
    // Create Journal Entry Record
    
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
                        value: jeObj.location
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
     * UTILS
     */
    
    // IMPORTANT!
    // CONSULT WITH CRISTINA!
    //@ TODO : This might be affecting data conversion error for Germany and Netherlands
    function getAllLiabilityAccounts() {
    	
    	var libAccts = ['280', '281', '466', '489', '1515', '1604'];
    	
    	/* Default to Cristina's email for now 8/13/2018
    	 
    	var accountSearchObj = search.create({
    		   type: "account",
    		   filters:
    		   [
    		      ["type","anyof","AcctPay","OthCurrLiab","LongTermLiab"], 
    		      "AND", 
    		      ["number","isnotempty",""]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({name: "number", label: "Number"}),
    		      search.createColumn({name: "name", label: "Name"})
    		   ]
    		});
    		var searchResultCount = accountSearchObj.runPaged().count;
    		log.debug("accountSearchObj result count",searchResultCount);
    		accountSearchObj.run().each(function(result){
    		   // .run().each has a limit of 4,000 results
    			libAccts.push(result.id);
    			return true;
    		});
    		
    		*/
    	
    	return libAccts;
    }
    
    
    /**
     * Converting data to have unique value in collection
     */

    var getUniqueDebitNumbers = function(data, specialDebit) {
        var allDebitAccts = [];
        data.forEach(function(o) {
            allDebitAccts.push(o.debit_account);
        });

        if(specialDebit) allDebitAccts.push(specialDebit);

        return lodash.uniq(allDebitAccts);
    };

    var getUniqueCreditNumbers = function(data, specialCredit) {
        var allCreditAccts = [];
        data.forEach(function(o){
            allCreditAccts.push(o.credit_account);
        });

        // Manually Adding Account 21395 (ACC_ESPP_WITHHOLDING)
        if(specialCredit) allCreditAccts.push(specialCredit);

        return lodash.uniq(allCreditAccts);
    };

    var getUniqueDepartments = function(data) {
        var allDepts = [];
        data.forEach(function(o){
            allDepts.push(o.department);
        });

        return lodash.uniq(allDepts);
    };
    
    
    
    
    // Expose functions and make them available 
    exports.writeJournalEntry = writeJournalEntry;
    exports.getPaycodeToAccountTable = getPaycodeToAccountTable;
    exports.searchAndFillAccountId = searchAndFillAccountId;
    exports.searchAndFillDepartmentId = searchAndFillDepartmentId;
    exports.getUniqueDebitNumbers = getUniqueDebitNumbers;
    exports.getUniqueCreditNumbers = getUniqueCreditNumbers;
    exports.getUniqueDepartments = getUniqueDepartments;
	
    return exports;

});
