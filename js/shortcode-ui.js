var Shortcode_UI;

( function( $ ) {

	var t = Shortcode_UI = this;

	t.model      = {};
	t.collection = {};
	t.view       = {};
	t.controller = {};
	t.utils      = {};

	// Modal Controller
	t.model.Shortcode_UI = Backbone.Model.extend({
		_this: this,
		openInsertModal: function() {
			this.set( 'action', 'select' );
			this.set( 'currentShortcode', null );
			frame = new t.view.insertModal.frame( this );
			frame.open();
		},
		openEditModal: function( shortcodeModel ) {
			this.set( 'action', 'update' );
			this.set( 'currentShortcode', shortcodeModel );
			frame = new t.view.insertModal.frame( this );
			frame.open();
		},
	});

	t.model.ShortcodeAttribute = Backbone.Model.extend({
		defaults: {
			attr:  '',
			label: '',
			type:  '',
			value: '',
		},
	});

	t.model.ShortcodeAttributes = Backbone.Collection.extend({
		model: t.model.ShortcodeAttribute,
		clone: function(deep) {
			if ( deep ) {
				return new this.constructor( _.map( this.models, function(m) {
					return m.clone();
				} ) );
			} else {
				return Backbone.Collection.prototype.clone();
			}
		}
	});

	t.model.Shortcode = Backbone.Model.extend({

		defaults: {
			label: '',
			shortcode: '',
			attrs: t.model.ShortcodeAttributes,
		},

		/**
		 * Custom set method.
		 * Handles setting the attribute collection.
		 */
		set: function( attributes, options ) {

		    if ( attributes.attrs !== undefined && ! ( attributes.attrs instanceof t.model.ShortcodeAttributes ) ) {
		        attributes.attrs = new t.model.ShortcodeAttributes( attributes.attrs );
		    }

		    return Backbone.Model.prototype.set.call(this, attributes, options);
		},

		/**
		 * Custon toJSON.
		 * Handles converting the attribute collection to JSON.
		 */
		toJSON: function( options ) {
			options = Backbone.Model.prototype.toJSON.call(this, options);
			if ( options.attrs !== undefined && ( options.attrs instanceof t.model.ShortcodeAttributes ) ) {
				options.attrs = options.attrs.toJSON();
			}
			return options;
    	},

    	/**
    	 * Make sure we don't clone a reference to attributes.
    	 */
    	clone: function() {
    		var clone = Backbone.Model.prototype.clone.call( this );
    		// Deep clone attributes.
    		clone.set( 'attrs', clone.get( 'attrs' ).clone( true ) );
			return clone;
    	},

		/**
		 * Get the shortcode as... a shortcode!
		 *
		 * @return string eg [shortcode attr1=value]
		 */
		formatShortcode: function() {

			var template, shortcodeAttributes, attrs = [], content;

			this.get( 'attrs' ).each( function( attr ) {

				if ( attr.get( 'attr' ) === 'content' ) {
					content = attr.get( 'value' );
				} else {
					attrs.push( attr.get( 'attr' ) + '="' + attr.get( 'value' ) + '"' );
				}

			} );

			template = "[shortcode attributes]"

			if ( content && content.length > 1 ) {
				template += "content[/shortcode]"
			}

			template = template.replace( /shortcode/g, this.get('shortcode_tag') );
			template = template.replace( /attributes/g, attrs.join( ' ' ) );
			template = template.replace( /content/g, content );

			return template;

		}

	});

	// Shortcode Collection
	t.collection.Shortcodes = Backbone.Collection.extend({
		model: t.model.Shortcode
	});

	/**
	 * Single shortcode list item view.
	 * Used for add new shortcode modal.
	 */
	t.view.insertShortcodeListItem = Backbone.View.extend({
		tagName: 'li',
		template:  wp.template('add-shortcode-list-item'),
		className: 'shortcode-list-item',

		render: function() {

			var data = this.model.toJSON();

			this.$el.attr( 'data-shortcode', data.shortcode_tag );

			if ( ( 'listItemImage' in data ) && 0 === data.listItemImage.indexOf( 'dashicons-' ) ) {
				data.listItemImage = '<div class="dashicons ' + data.listItemImage + '"></div>';
			}

			this.$el.html( this.template( data ) );

			return this;

		}
	});

	t.view.insertShortcodeList = Backbone.View.extend({

		tagName: 'div',

		initialize: function(options) {
			this.options = {};
			this.options.shortcodes = options.shortcodes;
		},

		render: function(){

			var t = this;

			t.$el.html('');

			var $listEl = $('<ul class="add-shortcode-list">');
			t.options.shortcodes.each( function( shortcode ) {

				var view = new Shortcode_UI.view.insertShortcodeListItem( {
					model: shortcode
				} );

				$listEl.append(
					view.render().el
				);

			} );

			t.$el.append( $listEl );

			return t;

		}

	});

	/**
	 * Single edit shortcode content view.
	 * Used for add/edit shortcode modal.
	 */
	t.view.shortcodeEditForm = Backbone.View.extend({

		template: wp.template('shortcode-default-edit-form'),

		// Handle custom params passed to view.
		initialize: function(options) {
			this.options = {};
			this.options.action = options.action;
		},

		render: function(){

			var view      = this.$el.html( this.template( this.model.toJSON() ) );
			var $fieldsEl = view.find( '.edit-shortcode-form-fields' );

			this.model.get( 'attrs' ).each( function( attr ) {
				$fieldsEl.append(
					new t.view.attributeEditField( { model: attr } ).render()
				);
			} );

			return view;

		},

	});

	t.view.attributeEditField = Backbone.View.extend( {

		tagName: "div",

		events: {
			'keyup  input[type="text"]':   'updateValue',
			'keyup  textarea':             'updateValue',
			'change select':               'updateValue',
			'change input[type=checkbox]': 'updateValue',
			'change input[type=radio]':    'updateValue',
		},

		render: function() {
			this.template = wp.media.template( 'shortcode-ui-field-' + this.model.get( 'type' ) );
			return this.$el.html( this.template( this.model.toJSON() ) );
		},

		/**
		 * Input Changed Update Callback.
		 *
		 * If the input field that has changed is for content or a valid attribute,
		 * then it should update the model.
		 */
		updateValue: function( e ) {
			var $el = $( e.target );
			this.model.set( 'value', $el.val() );
		},

	} );

	t.view.Shortcode_UI = Backbone.View.extend({

		options: {
			action: 'select'
		},

		events: {
			"click .add-shortcode-list li":      "select",
			"click .media-button-insert":        "insert",
			"click .edit-shortcode-form-cancel": "cancelSelect"
		},

		render: function() {

			this.$el.html('');

			switch( this.options.action ) {
				case 'select' :
					this.renderSelectShortcodeView();
					break;
				case 'update' :
				case 'insert' :
					this.renderEditShortcodeView();
					break;
			}

		},

		renderSelectShortcodeView: function() {
			this.$el.append(
				new t.view.insertShortcodeList( { shortcodes: t.shortcodes } ).render().el
			);
		},

		renderEditShortcodeView: function() {

			var view = new t.view.shortcodeEditForm( {
				model:  this.options.currentShortcode,
				action: this.options.action
			} );

			this.$el.append( view.render() );

			if ( this.options.action === 'update' ) {
				this.$contentEl.find( '.edit-shortcode-form-cancel' ).remove();
			}

		},

		cancelSelect: function() {
			this.options.action = 'select';
			this.options.currentShortcode = null;
			this.render();
		},

		select: function(e) {

			this.options.action = 'insert';
			var target    = $(e.currentTarget).closest( '.shortcode-list-item' );
			var shortcode = Shortcode_UI.shortcodes.findWhere( { shortcode_tag: target.attr( 'data-shortcode' ) } );

			if ( ! shortcode ) {
				return;
			}

			this.options.currentShortcode = shortcode.clone();

			this.render();

		},

		insert: function() {
			var shortcode = this.options.currentShortcode.formatShortcode();
			send_to_editor( shortcode );
			this.close();
		}

	});

	t.view.insertModal = {

		frame: function( delegate ) {

			if ( this._frame )
				return this._frame;

			var _frame = wp.media.view.Frame.extend({

				className: 'media-frame',
				template:  wp.media.template('shortcode-ui-media-frame'),
				model: delegate,
				events: {
					"click .add-shortcode-list li": "selectEditShortcode",
					"click .media-button-insert": "insertShortcode",
					"submit .edit-shortcode-form": "insertShortcode",
					"click .edit-shortcode-form-cancel": 'cancelInsert'
				},

				initialize: function( a ) {

					this.shortcodes = Shortcode_UI.shortcodes;

					this.options = this.model.attributes;

					if ( ! this.options.action ) {
						this.options.action = 'select';
					}

					wp.media.view.Frame.prototype.initialize.apply( this, arguments );

					// Ensure core UI is enabled.
					this.$el.addClass('wp-core-ui');

					this.originalActiveEditor = false;

					// Initialize modal container view.
					this.modal = new wp.media.view.Modal({
						controller: this,
						title:	  "Edit Image"
					});

					this.modal.content( this );

					this.activeRichTextEditors = Array();

					this.modal.$el.addClass('shortcode-ui-insert')

				},

				render: function() {

					var r = wp.media.view.Frame.prototype.render.apply( this, arguments );

					this.$toolbarEl  = this.$el.find( '.media-frame-toolbar' );
					this.$contentEl = this.$el.find( '.media-frame-content' );

					this.$contentEl.html('');
					this.$toolbarEl.html('');

					switch( this.options.action ) {
						case 'select' :
							this.renderAddShortcodeList();
							break;
						case 'update' :
						case 'insert' :
							this.renderEditShortcodeForm();
							break;
					}

					this.renderFooter();

					return r;
				},

				renderAddShortcodeList: function() {

					this.$contentEl.append(
						new t.view.insertShortcodeList( { shortcodes: t.shortcodes } ).render().el
					);
				},

				renderEditShortcodeForm: function() {
					var view = new t.view.shortcodeEditForm( {
						model:  this.options.currentShortcode,
						action: this.options.action
					} );

					this.$contentEl.append( view.render() );

					if ( this.options.action === 'update' ) {
						this.$contentEl.find( '.edit-shortcode-form-cancel' ).remove();
					}

				},

				// @todo make this nicer.
				renderFooter: function() {

					var toolbar = $( '<div class="media-toolbar" />' );
					var el = $( '<div class="media-toolbar-primary" />' );
					var buttonSubmit = $('<button href="#" class="button media-button button-primary button-large media-button-insert" disabled="disabled">Insert into post</button>');

					buttonSubmit.appendTo( el );
					el.appendTo( toolbar );
					toolbar.appendTo( this.$toolbarEl );

					switch( this.options.action ) {
						case 'select' :
							buttonSubmit.attr( 'disabled', 'disabled' );
							break;
						case 'insert' :
							buttonSubmit.removeAttr( 'disabled' );
							break;
						case 'update' :
							buttonSubmit.removeAttr( 'disabled' );
							buttonSubmit.html( 'Update' );
							break;
					}

				},

				cancelInsert: function() {
					this.options.action = 'select';
					this.options.currentShortcode = null;
					this.render();
				},

				selectEditShortcode: function(e) {
					this.options.action = 'insert';
					var target    = $(e.currentTarget).closest( '.shortcode-list-item' );
					var shortcode = this.shortcodes.findWhere( { shortcode_tag: target.attr( 'data-shortcode' ) } );

					if ( ! shortcode ) {
						return;
					}

					this.options.currentShortcode = shortcode.clone();

					this.render();

				},

				insertShortcode: function() {
					var shortcode = this.options.currentShortcode.formatShortcode();
					send_to_editor( shortcode );
					this.close();
				}

			});

			// Map some of the modal's methods to the frame.
			_.each(['open','close','attach','detach','escape'], function( method ) {
				_frame.prototype[ method ] = function( view ) {
					if ( this.modal )
						this.modal[ method ].apply( this.modal, arguments );
					return this;
				};
			});

			this._frame = new _frame();

			return this._frame;
		},

		render: function() {

		},

		init: function() {

		}

	};


t.controller.MediaController = wp.media.controller.State.extend({

    initialize: function(){
        this.props = new Backbone.Model({ custom_data: '' });
        this.props.on( 'change:custom_data', this.refresh, this );
    },

    // called each time the model changes
    refresh: function() {
        // update the toolbar
    	this.frame.toolbar.get().refresh();
	},

	// called when the toolbar button is clicked
	customAction: function(){
	    console.log(this.props.get('custom_data'));
	}

});


// custom toolbar : contains the buttons at the bottom
t.view.MediaToolbar = wp.media.view.Toolbar.extend({
	initialize: function() {
		_.defaults( this.options, {
		    event: 'custom_event',
		    close: false,
			items: {
			    custom_event: {
			        text: 'XXX', // added via 'media_view_strings' filter,
			        style: 'primary',
			        priority: 80,
			        requires: false,
			        click: this.customAction
			    }
			}
		});

		wp.media.view.Toolbar.prototype.initialize.apply( this, arguments );
	},

    // called each time the model changes
    // Use this to set/unset button disabled state.
	refresh: function() {

	    // call the parent refresh
		wp.media.view.Toolbar.prototype.refresh.apply( this, arguments );
	},

	// triggered when the button is clicked
	customAction: function(){

		// console.log( this.controller.state().toJSON() );
		// console.log( typeof( this.controller.state() ) );
	    this.controller.state().customAction();
	}
});


	t.view.insertModal = {

		frame: function( delegate ) {

			if ( this._frame )
				return this._frame;

			var _frame = wp.media.view.Frame.extend({

				className: 'media-frame',
				template:  wp.media.template('shortcode-ui-media-frame'),
				model: delegate,
				events: {
					"click .add-shortcode-list li": "selectEditShortcode",
					"click .media-button-insert": "insertShortcode",
					"submit .edit-shortcode-form": "insertShortcode",
					"click .edit-shortcode-form-cancel": 'cancelInsert'
				},

				initialize: function( a ) {

					this.shortcodes = Shortcode_UI.shortcodes;

					this.options = this.model.attributes;

					if ( ! this.options.action ) {
						this.options.action = 'select';
					}

					wp.media.view.Frame.prototype.initialize.apply( this, arguments );

					// Ensure core UI is enabled.
					this.$el.addClass('wp-core-ui');

					this.originalActiveEditor = false;

					// Initialize modal container view.
					this.modal = new wp.media.view.Modal({
						controller: this,
						title:	  "Edit Image"
					});

					this.modal.content( this );

					this.activeRichTextEditors = Array();

					this.modal.$el.addClass('shortcode-ui-insert')

				},

				render: function() {

					var r = wp.media.view.Frame.prototype.render.apply( this, arguments );

					this.$toolbarEl  = this.$el.find( '.media-frame-toolbar' );
					this.$contentEl = this.$el.find( '.media-frame-content' );

					this.$contentEl.html('');
					this.$toolbarEl.html('');

					switch( this.options.action ) {
						case 'select' :
							this.renderAddShortcodeList();
							break;
						case 'update' :
						case 'insert' :
							this.renderEditShortcodeForm();
							break;
					}

					this.renderFooter();

					return r;
				},

				renderAddShortcodeList: function() {

					this.$contentEl.append(
						new t.view.insertShortcodeList( { shortcodes: t.shortcodes } ).render().el
					);
				},

				renderEditShortcodeForm: function() {
					var view = new t.view.shortcodeEditForm( {
						model:  this.options.currentShortcode,
						action: this.options.action
					} );

					this.$contentEl.append( view.render() );

					if ( this.options.action === 'update' ) {
						this.$contentEl.find( '.edit-shortcode-form-cancel' ).remove();
					}

				},

				// @todo make this nicer.
				renderFooter: function() {

					var toolbar = $( '<div class="media-toolbar" />' );
					var el = $( '<div class="media-toolbar-primary" />' );
					var buttonSubmit = $('<button href="#" class="button media-button button-primary button-large media-button-insert" disabled="disabled">Insert into post</button>');

					buttonSubmit.appendTo( el );
					el.appendTo( toolbar );
					toolbar.appendTo( this.$toolbarEl );

					switch( this.options.action ) {
						case 'select' :
							buttonSubmit.attr( 'disabled', 'disabled' );
							break;
						case 'insert' :
							buttonSubmit.removeAttr( 'disabled' );
							break;
						case 'update' :
							buttonSubmit.removeAttr( 'disabled' );
							buttonSubmit.html( 'Update' );
							break;
					}

				},

				cancelInsert: function() {
					this.options.action = 'select';
					this.options.currentShortcode = null;
					this.render();
				},

				selectEditShortcode: function(e) {
					this.options.action = 'insert';
					var target    = $(e.currentTarget).closest( '.shortcode-list-item' );
					var shortcode = this.shortcodes.findWhere( { shortcode_tag: target.attr( 'data-shortcode' ) } );

					if ( ! shortcode ) {
						return;
					}

					this.options.currentShortcode = shortcode.clone();

					this.render();

				},

				insertShortcode: function() {
					var shortcode = this.options.currentShortcode.formatShortcode();
					send_to_editor( shortcode );
					this.close();
				}

			});

			// Map some of the modal's methods to the frame.
			_.each(['open','close','attach','detach','escape'], function( method ) {
				_frame.prototype[ method ] = function( view ) {
					if ( this.modal )
						this.modal[ method ].apply( this.modal, arguments );
					return this;
				};
			});

			this._frame = new _frame();

			return this._frame;
		},

		render: function() {

		},

		init: function() {

		}

	};

	/**
	 * Generic shortcode mce view constructor.
	 */
	t.utils.shorcodeViewConstructor = {

		View: {

			shortcodeHTML: false,

			initialize: function( options ) {

				var placeholderShortcode = Shortcode_UI.shortcodes.findWhere( { shortcode_tag: options.shortcode.tag } );

				if ( ! placeholderShortcode ) {
					return;
				}

				shortcode = placeholderShortcode.clone();

				shortcode.get( 'attrs' ).each( function( attr ) {

					if ( attr.get( 'attr') in options.shortcode.attrs.named ) {
						attr.set(
							'value',
							options.shortcode.attrs.named[ attr.get( 'attr') ]
						);
					}

					if ( attr.get( 'attr' ) === 'content' && ( 'content' in  options.shortcode ) ) {
						attr.set( 'value', options.shortcode.content );
					}

				});

				this.shortcode = shortcode;

			},

			/**
			 * Render the shortcode
			 *
			 * To ensure consistent rendering - this makes an ajax request to the admin and displays.
			 * @return string html
			 */
			getHtml: function() {

				var t = this, data;

				if ( false === t.shortcodeHTML ) {

					data = {
						action: 'do_shortcode',
						post_id: $('#post_ID').val(),
						shortcode: this.shortcode.formatShortcode()
					};

					$.post( ajaxurl, data, function( response ) {
						// Note - set even if empty to prevent this firing multiple times.
						t.shortcodeHTML = response;
						t.render( true );
					});

				}

				return t.shortcodeHTML;

			}

		},

		/**
		 * Edit shortcode.
		 *
		 * Parses the shortcode and creates shortcode mode.
		 * @todo - I think there must be a cleaner way to get
		 * the shortcode & args here that doesn't use regex.
		 */
		edit: function( node ) {

			var shortcodeString, model, attr;

			shortcodeString = decodeURIComponent( $(node).attr( 'data-wpview-text' ) );

			var megaRegex = /\[(\S+)([^\]]+)?\]([^\[]*)?(\[\/(\S+?)\])?/;
			var matches = shortcodeString.match( megaRegex );

			if ( ! matches ) {
				return;
			}

			defaultShortcode = Shortcode_UI.shortcodes.findWhere( { shortcode_tag: matches[1] } );

			if ( ! defaultShortcode ) {
				return;
			}

			currentShortcode = defaultShortcode.clone();

			if ( typeof( matches[2] ) != undefined ) {

				attributeMatches = matches[2].match(/(\S+?=".*?")/g );

				// convert attribute strings to object.
				for ( var i = 0; i < attributeMatches.length; i++ ) {

					var bitsRegEx = /(\S+?)="(.*?)"/g;
					var bits = bitsRegEx.exec( attributeMatches[i] );

					attr = currentShortcode.get( 'attrs' ).findWhere( { attr: bits[1] } );
					if ( attr ) {
						attr.set( 'value', bits[2] );
					}

				}

			}

			if ( matches[3] ) {
				var content = currentShortcode.get( 'attrs' ).findWhere( { attr: 'content' } );
				if ( content ) {
					content.set( 'value', matches[3] );
				}
			}

			Shortcode_UI.modal.openEditModal( currentShortcode );

		}

	}

	$(document).ready(function(){

		t.shortcodes = new t.collection.Shortcodes( shortcodeUIData.shortcodes )
		t.modal      = new t.model.Shortcode_UI( shortcodeUIData.modalOptions );

		$('.shortcode-editor-open-insert-modal').click( function(e) {
			e && e.preventDefault();
			t.modal.openInsertModal();
		});

		t.shortcodes.each( function( shortcode ) {

			// Register the mce view for each shortcode.
			// Note - clone the constructor.
			wp.mce.views.register(
				shortcode.get('shortcode_tag'),
				$.extend( true, {}, t.utils.shorcodeViewConstructor )
			);

		} );

	});


// VIEW - MEDIA FRAME (MENU BAR)
var shortcodeFrame = wp.media.view.MediaFrame.Post;
wp.media.view.MediaFrame.Post = shortcodeFrame.extend({

	initialize: function() {

		shortcodeFrame.prototype.initialize.apply( this, arguments );

		var id = 'shortcode-ui';

		this.states.add([
			new t.controller.MediaController( {
				id      : id,
				router  : id + '-router',
				toolbar : id + '-toolbar',
				menu    : 'default',
				title   : 'Insert Content Item',
				tabs    : [ 'insert' ],
				priority: 20, // places it above Insert From URL
				content : id + '-content-insert'
			} )
		]);

		this.on( 'content:render:' + id + '-content-insert', _.bind( this.contentRender, this, 'shortcode-ui', 'insert' ) );
		// this.on( 'content:render:' + id, _.bind( this.contentRender, this ) );
		// this.on( 'content:render:' + id + '-content', _.bind( this.contentRender, this ) );
		this.on( 'router:create:' + id + '-router', this.createRouter, this );
		this.on( 'router:render:' + id + '-router', _.bind( this.routerRender, this ) );
		this.on( 'toolbar:create:' + id + '-toolbar', this.toolbarCreate, this );

	},

	routerRender : function( view ) {},

	contentRender : function( id, tab ) {

		this.content.set(
			new t.view.Shortcode_UI( {
				className  : 'clearfix ' + id + '-content ' + id + '-content-' + tab
			} )
		);

	},

	toolbarCreate : function( toolbar ) {
		toolbar.view = new t.view.MediaToolbar( {
			controller : this,
		} );
	},

	insertAction: function() {
		alert(1);
	},

});

} )( jQuery );