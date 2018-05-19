/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/task', 'N/ui/serverWidget'],
/**
 * @param {file} file
 * @param {task} task
 * @param {ui} ui
 */
function(file, task, ui) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	if (context.request.method === 'GET') {
    		var form = ui.createForm({
    			title: "Upload SVE CSV"
    		});
    		form.addSubmitButton({
    			label: "Create Journal Entry"
    		});
    		context.response.writePage(form);
    	}

    }

    return {
        onRequest: onRequest
    };
    
});
