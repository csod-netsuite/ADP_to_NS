define([], function () {

    /**
     * Reference for Company specific values
     *
     * @exports XXX
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan Yi <cyi@csod.com>
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     */
    var exports = {};

    var location = {
        'FR': '14',
        'IL': '15'
    };

    var currency = {
        'FR': '4'
    };

    var subsidiary = {
        'FR': '11'
    }

    var JE_HeaderFields = function(subsidiary, currency) {
        this.customForm = '106';
        this.subsidiary = subsidiary;
        this.custbodycash_use_category = '6';
        this.currency = currency;
        this.approved = false;
        this.lines = [];
    };

    exports.location = location;
    exports.currency = currency;
    exports.subsidiary = subsidiary;
    exports.JE_HeaderFields = JE_HeaderFields;
    return exports;
});
