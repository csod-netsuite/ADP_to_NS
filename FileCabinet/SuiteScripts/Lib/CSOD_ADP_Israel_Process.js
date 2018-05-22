define(['./CSOD_Lib_Ref', './CSOD_ADP_Common_Func'], function (LIB, COMMOM_FUNC) {

    /**
     * Israel Specific Script for creating Journal Entries
     *
     * @exports XXX
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     */
    var exports = {};

    var DEBIT_EXCEPTIONS = ['1604', '489'];

    var createIsraelJournal = function(data, debitAccts, creditAccts, depts, global_obj) {
        // Get Header Level Obj
        var jeObj = new LIB.JE_HeaderFields(global_obj.subsidiary, global_obj.currency, global_obj.location);

        // Write Debit Line
        for(var x = 0; x < depts.length; x++) {
            // if department is not empty string
            var dept = depts[x];

            if(dept) {
                // for every debit accounts
                for(var y = 0; y < debitAccts.length; y++) {

                    var debitAcct = debitAccts[y];

                    // if debit account is not empty string
                    if(debitAcct && DEBIT_EXCEPTIONS.indexOf(debitAcct) == -1) {
                        // create entry line
                        var debitLineObj = {
                            account: debitAcct,
                            debit: 0,
                            credit: 0,
                            department: dept,
                            location: global_obj.subsidiary
                        };

                        // go through each data
                        for(var z = 0; z < data.length; z++) {

                            var obj = data[z];
                            if(obj.department == dept) {
                                if(obj.debit_account == debitAcct) {
                                    // if amount can be parsed then add to debit
                                    if(parseFloat(obj.amount)) {
                                        debitLineObj.debit += parseFloat(obj.amount);
                                    }
                                }

                                if(obj.credit_account == debitAcct) {
                                    // if same debitAcct is in credit side
                                    // add the amount to debitLineObj.credit
                                    if(parseFloat(obj.amount)) {
                                        debitLineObj.credit += parseFloat(obj.amount);
                                    }

                                }
                            }
                        }

                        // deduct credit amount from debit
                        // push to JE lines if debit amount is not falsy
                        if(debitLineObj.debit) {
                            debitLineObj.debit = debitLineObj.debit;
                            debitLineObj.credit = debitLineObj.credit;
                            jeObj.lines.push(debitLineObj);
                        }


                    }

                }
            }
        } // End of Department Loop

        log.debug({
            title: 'jeObj check',
            details: jeObj.lines.slice(jeObj.lines.length - 10, jeObj.lines.length)
        });
        
        return jeObj;
        
    };

    exports.createIsraelJournal = createIsraelJournal;
    return exports;
});
