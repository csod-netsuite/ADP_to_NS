
define(['N/runtime', 'N/file', 'N/record', 'N/render', 'N/search', 
        './Lib/lodash', './Lib/CSOD_ADP_Lib_Ref', './Lib/CSOD_ADP_Common_Func',
        './Lib/CSOD_ADP_Israel_Process'],
    function (runtime, file, record, render, search, _, LIB, COMMON_FUNC, IL) {

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
    	
    	var csvFileId = runtime.getCurrentScript().getParameter('custscript_csod_sve_file_id');
    	
        var csvFile = file.load({
            id: csvFileId
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


    exports.execute = execute;
    return exports;
});
