winkstart.module('voip', 'media',
    {
        css: [
            'css/media.css'
        ],

        /* What HTML templates will we be using? */
        templates: {
            media: 'tmpl/media.html',
            editMedia: 'tmpl/edit.html'
        },

        /* What events do we listen for, in the browser? */
        subscribe: {
            'media.activate' : 'activate',
            'media.list-panel-click' : 'editMedia',
            'media.edit-media' : 'editMedia'
        },

        formData: {
        },

        validation : [
                {name : '#display_name', regex : /^.+$/},
        ],

        /* What API URLs are we going to be calling? Variables are in { }s */
        resources: {
            "media.list": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/media',
                dataType: 'json',
                httpMethod: 'GET'
            },
            "media.get": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/media/{media_id}',
                dataType: 'json',
                httpMethod: 'GET'
            },
            "media.create": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/media',
                dataType: 'json',
                httpMethod: 'PUT'
            },
            "media.update": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/media/{media_id}',
                dataType: 'json',
                httpMethod: 'POST'
            },
            "media.delete": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/media/{media_id}',
                dataType: 'json',
                httpMethod: 'DELETE'
            }
        }
    },

    /* Bootstrap routine - run when the module is first loaded */
    function(args) {
        winkstart.publish('subnav.add', {
            module: this.__module,
            label: 'Media',
            icon: 'media'
        });
    },

    {
        validateForm: function(state) {
            var THIS = this;
            
            $(THIS.config.validation).each(function(k, v) {
                if(state == undefined) {
                    winkstart.validate.add($(v.name), v.regex);
                } else if (state == 'save') {
                    winkstart.validate.save($(v.name), v.regex);
                }
            });
        },

        saveMedia: function(media_id, form_data) {
            var THIS = this;

            /* Check validation before saving */
            THIS.validateForm('save');
            if(!$('.invalid').size()) {
                /* Construct the JSON we're going to send */
                var rest_data = {};
                rest_data.crossbar = true;
                rest_data.account_id = MASTER_ACCOUNT_ID;
                rest_data.data = form_data;

                /* Is this a create or edit? See if there's a known ID */
                if (media_id) {
                    /* EDIT */
                    rest_data.media_id = media_id;
                    console.log(rest_data);
                    winkstart.postJSON('media.update', rest_data, function (json, xhr) {
                        /* Refresh the list and the edit content */
                        THIS.renderList();
                        THIS.editMedia({
                            id: media_id
                        });
                    });
                } else {
                    /* CREATE */
                    /* Actually send the JSON data to the server */
                    winkstart.putJSON('media.create', rest_data, function (json, xhr) {
                        THIS.renderList();
                        console.log(json);
                        THIS.editMedia({
                            id: json.data.id
                        });
                    });
                }
            } else {
                alert('Please correct errors that you have on the form.');
            }
        },

        /*
         * Create/Edit media properties (don't pass an ID field to cause a create instead of an edit)
         */
        editMedia: function(data){
            $('#media-view').empty();
            var THIS = this;
            var form_data = {
                data: {},   
                field_data: THIS.config.formData,
                value: {}
            };

            if (data && data.id) {
                /* This is an existing media - Grab JSON data from server for media_id */
                winkstart.getJSON('media.get', {
                    crossbar: true,
                    account_id: MASTER_ACCOUNT_ID,
                    media_id: data.id
                }, function(json, xhr) {
                    /* On success, take JSON and merge with default/empty fields */
                    $.extend(true, form_data, json);

                    THIS.renderMedia(form_data);
                });
            } else {
                /* This is a new media - pass along empty params */
                THIS.renderMedia(form_data);
            }
            
        },

        deleteMedia: function(media_id) {
            var THIS = this;
            
            var rest_data = {
                crossbar: true,
                account_id: MASTER_ACCOUNT_ID,
                media_id: media_id
            };

            /* Actually send the JSON data to the server */
            winkstart.deleteJSON('media.delete', rest_data, function (json, xhr) {
                THIS.renderList();
                $('#media-view').empty();
            });
        },

        /**
         * Draw media fields/template and populate data, add validation. Works for both create & edit
         */
        renderMedia: function(form_data){
            var THIS = this;
            var media_id = form_data.data.id;
            
            /* Paint the template with HTML of form fields onto the page */
            THIS.templates.editMedia.tmpl(form_data).appendTo( $('#media-view') );

            winkstart.cleanForm();

            /* Initialize form field validation */
            THIS.validateForm();

            $("ul.settings1").tabs("div.pane > div");
            $("ul.settings2").tabs("div.advanced_pane > div");
            $("#display_name").focus();

            /* Listen for the submit event (i.e. they click "save") */
            $('.media-save').click(function(event) {
                /* Save the data after they've clicked save */

                /* Ignore the normal behavior of a submit button and do our stuff instead */
                event.preventDefault();

                /* Grab all the form field data */
                var form_data = form2object('media-form');
                THIS.saveMedia(media_id, form_data);

                return false;
            });

            $('.media-cancel').click(function(event) {
                event.preventDefault();

                /* Cheat - just delete the main content area. Nothing else needs doing really */
                $('#media-view').empty();

                return false;
            });

            $('.media-delete').click(function(event) {
                /* Save the data after they've clicked save */

                /* Ignore the normal behavior of a submit button and do our stuff instead */
                event.preventDefault();

                THIS.deleteMedia(media_id);

                return false;
            });
        },

        /* Builds the generic data list on the left hand side. It's responsible for gathering the data from the server
         * and populating into our standardized data list "thing".
         */
        renderList: function(){
            var THIS = this;

            winkstart.getJSON('media.list', {
                crossbar: true,
                account_id: MASTER_ACCOUNT_ID
            }, function (json, xhr) {

                // List Data that would be sent back from server
                function map_crossbar_data(crossbar_data){
                    var new_list = [];
                    if(crossbar_data.length > 0) {
                        _.each(crossbar_data, function(elem){
                            new_list.push({
                                id: elem.id,
                                title: elem.display_name
                            });
                        });
                    }
                    return new_list;
                }

                var options = {};
                options.label = 'Media Module';
                options.identifier = 'media-module-listview';
                options.new_entity_label = 'Media';
                options.data = map_crossbar_data(json.data);
                options.publisher = winkstart.publish;
                options.notifyMethod = 'media.list-panel-click';
                options.notifyCreateMethod = 'media.edit-media';  /* Edit with no ID = Create */

                $("#media-listpanel").empty();
                $("#media-listpanel").listpanel(options);

            });
        },

        /* This runs when this module is first loaded - you should register to any events at this time and clear the screen
         * if appropriate. You should also attach to any default click items you want to respond to when people click
         * on them. Also register resources.
         */
        activate: function(data) {
            $('#ws-content').empty();
            var THIS = this;
            this.templates.media.tmpl({}).appendTo( $('#ws-content') );

            winkstart.loadFormHelper('forms');

            /* Tell winkstart about the APIs you are going to be using (see top of this file, under resources */
            winkstart.registerResources(this.config.resources);

            winkstart.publish('layout.updateLoadedModule', {
                label: 'Media Management',
                module: this.__module
            });

            $('.edit-media').live({
                click: function(evt){
                    var target = evt.currentTarget;
                    var media_id = target.getAttribute('rel');
                    winkstart.publish('media.edit-media', {
                        'media_id' : media_id
                    });
                }
            });

            THIS.renderList();
        }
    }
);
