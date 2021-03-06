/*
*
* Gravy is a small form validation library.
*
* Used specifically for Venmo's Backbone Env.
*
* By Julian Connor
*
*/
Backbone.Gravy = Backbone.View;

_.extend(Backbone.Gravy.prototype, {
    /*
    * List of reserved words.
    */
    _r    : ["success", "error", "clear", "submit"],

    /*
    * Used during form submission validation.
    */
    _v    : false,

    /*
    *
    * Helper function to detect if str is reserved for Gravy.
    *
    * @param {String} el
    */
    _reserved : function(el) {
        for ( w in this._r ) {
            if ( el === this._r[w] )
                return true;
        }
        return false;
    },

    /*
    *
    * Validates the value with the appropriate
    * validation method.
    *
    * Returns an object with a summary of the
    * results.
    *
    * @param {String} name
    * @param {String} val
    *
    */
    _validateNode: function(name, val) {
        var gravy   = this.gravy,
            success = null,
            error   = null,
            vKey    = gravy[name];

        /*
        *
        * Throw error if validator is not found.
        *
        * Validator can be a String, Function, or Object.
        *
        */
        if ( !(validator = vKey instanceof Object ?
               vKey : (this[vKey] || this.model[vKey])) ) 
            throw new Error("[Gravy] Unable to find validator for: " + name);

        /*
        *
        * If name points to an object, one or more custom rules for field.
        *
        * Check for validation methods in the gravy hash and model
        *
        */
        if ( _.isObject(validator) && !_.isFunction(validator) ) {

            success = validator.success;
            error   = validator.error;

            /*
            * The Horror!
            *
            * Checks View and Model for validation method.
            */
            if ( !((validator = validator.validator) &&
                   (validator = (this[validator] || this.model[validator]))))
                throw new Error("[Gravy] Unable to find validator for: " + name);
        } 

        return {
            result  : validator.apply(this, [val]),
            success : (success || gravy.success),
            error   : (error   || gravy.error)
        };
    },

    /*
    *
    * Applies the appropriate callback based on validation.
    *
    * @param {Object} callback
    * @param {$} node
    *
    */
    _applyCallback: function(callback, node) {
        /*
        *
        * Validates the value of the input and grabs the appropriate
        * success and error callbacks.
        *
        */
        callback = callback.result ? callback.success : callback.error;
        if (!_.isFunction(callback)) {
            callback = this[callback];
        }

        /*
        *
        * Invokes the callback and passes along the input node.
        *
        */
        return callback.apply(this, [node]);
    },

    /*
    *
    * Default callback for form focusout events.
    *
    * Catches an event and searches the view/model
    * for the appropriate validation method and callback.
    *
    * @param {Event} e
    */
    validate: function(e){
        var callback, node, name, val, gravy, error = null, success = null;

        node  = $(e.target);
        val = e.target.value;
        gravy = this.gravy;

        /*
        *
        * Invoke 'clear' callback if node value is empty.
        *
        */
        if ( !this._v && !val.length && gravy.clear )
            return this[gravy.clear].apply(this, [node]);

        name  = e.target.name;

        /*
        *
        * End execution if name is not found in gravy.
        *
        */
        if ( !gravy[name] ) {
            console.error("[Gravy] Did not find " + name + " in gravy hash");
            return;
        }

        callback = this._validateNode(name,val);

        return this._applyCallback(callback, node);
    },

    /*
    *
    * Catches form submissions, loops through all
    * keys that aren't Gravy reserved words.
    *
    * Validates all fields and invokes callbacks
    * based on results.
    *
    * @param {Event} e
    */
    validateAll: function(e) {
        /*
        * Stop form submission.
        */
        e.preventDefault();

        var valid = true,
            gravy = this.gravy, 
            submit = gravy.submit, val, validator, node;

        this._v = true;

        /*
        *
        * Loop through gravy, if not reserved word invoke validation
        * on that element. Maintain net validation status.
        *
        * Apply the appropriate callback.
        *
        */
        for ( field in gravy ) {
            if ( !this._reserved(field) ) {
                node = this.$('#'+field);
                val = node.val();
                
                callback = this._validateNode(field, val);
                
                if ( !callback.result )
                    valid = false;

                this._applyCallback(callback, node);
            }
        }

        this._v = false;

        /*
        *
        * If form is not valid and there is no
        * error callback. Do nothing.
        *
        */
        if ( !valid && !this[submit.error] )
            return;

        /*
        *
        * If form is valid and there is no
        * success callback. Error.
        *
        * TODO: This is subject to change, may have a scenario where
        * you would want to simply validate the form but not 
        * do anything.
        *
        */
        if ( valid && !this[submit.success] ) 
            throw new Error("[Gravy] Unable to find submission success callback!");

        return this[!!valid ? submit.success : submit.error].apply(this, [$(e.target)]);
    }
});
