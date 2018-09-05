/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/redirect', 'N/file', 'N/task', 'N/ui/serverWidget', 'N/record', 'N/render', 'N/search', 
        './Lib/lodash', './Lib/CSOD_ADP_Lib_Ref', './Lib/CSOD_ADP_Common_Func'/*,
        './Lib/CSOD_ADP_Israel_Process'*/],
/**
 * @param {file} file
 * @param {task} task
 * @param {ui} ui
 */
function(redirect, file, task, ui, record, render, search, _, LIB, COMMON_FUNC/*, IL*/) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
	
    // Settings for the script
    const logEnable = true;

    // Credit Department
    const creditDepartment = '12';

    // Accrued ESPP Withholdings ID (negative debit)
    const ACC_ESPP_WITHHOLDING = '1604';
    
    const SUITELET_ID = '2005';
    
    const FOLDER_ID = '2738762';

    // global value initialization

    var GLOBAL_COUNTRY_SPECIFIC = {
        location: '',
        subsidiary: '',
        currency: '',
        countryCode: ''
    };
	
	
    function onRequest(context) {
    	
    	var action = context.request.parameters.action;
    	var fileId = context.request.parameters.fileId;
    	
    	log.debug({
    		title: 'action value check',
    		details: action
    	});
    	
    	log.debug({
    		title: 'fileId',
    		details: fileId
    	});
    	
    	if (context.request.method !== 'POST' && action !== 'set') {
    		
    		var form = ui.createForm({
    			title: "Upload SVE CSV"
    		});
    		
    		form.clientScriptModulePath = 'SuiteScripts/Lib/CSOD_CL_ADP_To_JE_Suitelet.js';
    		
    		var hiddenField = form.addField({
    			id: 'custpage_action',
    			label: 'Hidden Action',
    			type: ui.FieldType.TEXT
    		})
    		
    		hiddenField.updateDisplayType({
    			displayType: ui.FieldDisplayType.HIDDEN
    		});
    		
    		hiddenField.defaultValue = '1';
    		
    		var filefield = form.addField({
    			id: 'custpage_csv_file_upload',
    			label: 'Add CSV File',
    			type: ui.FieldType.FILE
    		});
    	
    		form.addSubmitButton({
    			label: 'Load CSV'
    		});
    		
    		context.response.writePage(form);
    	}
    	
    	if(context.request.method !== 'POST' && fileId && action === 'set') {
    		
    		var form = ui.createForm({
    			title: 'Create New Journal Entry'
    		});
    		
    		form.clientScriptModulePath = 'SuiteScripts/Lib/CSOD_CL_ADP_To_JE_Suitelet.js';
    		
    		var hiddenField = form.addField({
    			id: 'custpage_action',
    			label: 'Hidden Action',
    			type: ui.FieldType.TEXT
    		})
    		
    		hiddenField.updateDisplayType({
    			displayType: ui.FieldDisplayType.HIDDEN
    		});
    		
    		hiddenField.defaultValue = '2';
    		
    		var balanceFld = form.addField({
    			id: 'custpage_balance_check',
    			label: 'Balance Check',
    			type: ui.FieldType.TEXT
    		});
    		
    		balanceFld.updateDisplayType({
    			displayType: ui.FieldDisplayType.INLINE
    		});
    		
    		var headerLevelObj = form.addField({
    			id: 'custpage_jeobj_header',
    			label: 'Object for Script',
    			type: ui.FieldType.TEXTAREA
    		});
    		
    		headerLevelObj.updateDisplayType({
    			displayType: ui.FieldDisplayType.INLINE
    		})
    		
    		var jeObj = parseCSV(fileId);
    		
    		log.debug({
    			title: 'jeObj value check',
    			details: jeObj
    		});
    		
    		
    		var jeLineSublist = form.addSublist({
    			id: 'custpage_je_line_sublist',
    			label: 'Journal Lines',
    			type: ui.SublistType.INLINEEDITOR
    		});
    		
    		jeLineSublist.addField({
    			id: 'account',
    			label: 'Account',
    			type: ui.FieldType.SELECT,
    			source: 'account'
    		});
    		
    		jeLineSublist.addField({
    			id: 'debit_amount',
    			label: 'Debit',
    			type: ui.FieldType.CURRENCY
    		});
    		
    		jeLineSublist.addField({
    			id: 'credit_amount',
    			label: 'Credit',
    			type: ui.FieldType.CURRENCY
    		});
    		
    		jeLineSublist.addField({
    			id: 'department',
    			label: 'Department',
    			type: ui.FieldType.SELECT,
    			source: 'department'
    		});
    		
    		jeLineSublist.addField({
    			id: 'location',
    			label: 'Location',
    			type: ui.FieldType.SELECT,
    			source: 'location'
    		});
    		
    		var totalDebit = 0;
    		var totalCredit = 0;
    		
    		for(i = 0; i < jeObj.lines.length; i++) {

    			jeLineSublist.setSublistValue({
    				id: 'account',
    				line: i,
    				value: jeObj.lines[i].account
    			});
    			
    			jeLineSublist.setSublistValue({
    				id: 'debit_amount',
    				line: i,
    				value: jeObj.lines[i].debit
    			});
    			
    			totalDebit += jeObj.lines[i].debit;
    			
    			jeLineSublist.setSublistValue({
    				id: 'credit_amount',
    				line: i,
    				value: jeObj.lines[i].credit
    			});
    			
    			totalCredit += jeObj.lines[i].credit;
    			
    			jeLineSublist.setSublistValue({
    				id: 'department',
    				line: i,
    				value: jeObj.lines[i].department
    			});
    			
    			jeLineSublist.setSublistValue({
    				id: 'location',
    				line: i,
    				value: jeObj.lines[i].location
    			});
    		}
    		
    		delete jeObj.lines
    		
    		headerLevelObj.defaultValue = JSON.stringify(jeObj) 
    		
    		balanceFld.defaultValue = 'Debit = ' + totalDebit + ', Credit = ' + totalCredit;
    		
    		
    		form.addSubmitButton({
    			label: 'Create New Journal Entry'
    		});
    		
    		context.response.writePage(form);
    		
    	}
    	
    	if(context.request.method === 'POST') {
    		log.debug({
    			title: 'POST called'
    		});
    		
    		var csvFileObj = context.request.files.custpage_csv_file_upload;
    		
    		if(csvFileObj) {
    			
        		csvFileObj.folder = FOLDER_ID;
        		var fileId = csvFileObj.save();
        		log.debug({
        			title: 'fileId',
        			details: fileId
        		});
        		
        		redirect.toSuitelet({
        			scriptId: SUITELET_ID,
        			deploymentId: 1,
        			parameters: {
        				'action' : 'set',
        				'fileId' : fileId
        			}
        		});
        		
    		} else {
    			var jeObj = JSON.parse(context.request.parameters.custpage_jeobj_header);
    			
    			jeObj.lines = [];
    			
    			var sublistCount = context.request.getLineCount('custpage_je_line_sublist');
    			
    			for(var i = 0; i < sublistCount; i++) {
    				
    				var newLineObj = {};
    				
    				newLineObj.account = context.request.getSublistValue({
    					group: 'custpage_je_line_sublist',
    					name: 'account',
    					line: i
    				});
    				
    				newLineObj.debit = +context.request.getSublistValue({
    					group: 'custpage_je_line_sublist',
    					name: 'debit_amount',
    					line: i
    				});
    				
    				newLineObj.credit = +context.request.getSublistValue({
    					group: 'custpage_je_line_sublist',
    					name: 'credit_amount',
    					line: i
    				});
    				
    				newLineObj.department = context.request.getSublistValue({
    					group: 'custpage_je_line_sublist',
    					name: 'department',
    					line: i
    				});
    				
    				newLineObj.location = context.request.getSublistValue({
    					group: 'custpage_je_line_sublist',
    					name: 'location',
    					line: i
    				});
    				
    				jeObj.lines.push(newLineObj);
    			}
    			
    			log.debug({
    				title: 'POST value check',
    				details: 'jeObj = ' + JSON.stringify(jeObj)
    			});
    			
    			var newJeId =  COMMON_FUNC.writeJournalEntry(jeObj);
    			
    			if(newJeId) {
    				redirect.toRecord({
    					id: newJeId,
    					type: record.Type.JOURNAL_ENTRY
    				});
    			}
    			
    			
    		}
    		
    	}

    }
    
    var parseCSV = function(fileId) {
		
    	
        var csvFile = file.load({
            id: fileId
        });

        var dataInObject = getDataObject(csvFile);

        var paycodeAccountObj = COMMON_FUNC.getPaycodeToAccountTable(GLOBAL_COUNTRY_SPECIFIC.countryCode);

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
        
        var output;
        
        switch(GLOBAL_COUNTRY_SPECIFIC.countryCode) {
            case 'FR':
                // FRANCE
                log.debug('Processing France');
                output = createJournalEntry(dataWithDepartment, debitAccounts, creditAccounts, departments, GLOBAL_COUNTRY_SPECIFIC);
                break;

            case 'IL':
                // ISRAEL
                log.debug('Processing Israel');
                output = IL.createIsraelJournal(dataWithDepartment, debitAccounts, creditAccounts, departments, GLOBAL_COUNTRY_SPECIFIC);
                break;

            default:
            	output = createJournalEntry(dataWithDepartment, debitAccounts, creditAccounts, departments, GLOBAL_COUNTRY_SPECIFIC);
                break;

        }
        
        return output;

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
            
            var dataArr = line.value.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            
            log.debug("dataArr check", dataArr);
            
            for(var i = 0; i < dataArr.length; i++) {
            	if(dataArr[i]) {
            		dataArr[i] = dataArr[i].replace(/"|,/g, '');
            		if(i == 6) {
            			log.debug("new test value check", dataArr[i]);
                    	log.debug("can I parse it?", parseFloat(dataArr[i]));
            		}
                	
                }
            }
            
            log.debug("dataArr check after manipulation", dataArr);

            var arr = dataArr;

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

            if(!isNaN(parseInt(arr[0])) && arr[4]) {
                var employeeIdStr = arr[0];


                // substring for employee id format
                if(employeeIdStr.length == 8 && employeeIdStr.substring(0,2) == "00") {
                    employeeIdStr = employeeIdStr.substring(2, employeeIdStr.length)
                }
                tempObj.employee_id = employeeIdStr.trim();
                tempObj.paycode = arr[4].trim();
                tempObj.amount = parseFloat(arr[6]);

            }

            if(LIB.logEnable) {
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
                            location: global_obj.location
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
                location: global_obj.location
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
                	// TODO flip to credit - this is testing for 8/21/2018
                    creditLineObj.credit = -creditLineObj.credit;
                    jeObj.lines.push(creditLineObj);
                }
            }
        } // end of credit accounts loop

        log.debug({
            title: "entry credit lines check",
            details: jeObj.lines.slice(jeObj.lines.length - 5, jeObj.lines.length)
        });
        
        return jeObj;
        
        /*
        var newJeId =  COMMON_FUNC.writeJournalEntry(jeObj);

        log.debug({
            title: 'new journal created',
            details: 'id : ' + newJeId
        });
		
		*/
    };
    

    return {
        onRequest: onRequest
    };
    
});
