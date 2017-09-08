/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2016 (original work) Open Assessment Technologies SA;
 *
 * @author Christophe Noël <christophe@taotesting.com>
 *
 */
define([
    'qtiCustomInteractionContext',
    'IMSGlobal/jquery_2_1_1',
    'OAT/lodash',
    'OAT/util/event',
    'OAT/util/html',
    'mathEntryInteraction/runtime/mathquill/mathquill'
], function(
    qtiCustomInteractionContext,
    $,
    _,
    event,
    html,
    MathQuill
){
    'use strict';

    var ns = '.mathEntryInteraction';
    var MQ = MathQuill.getInterface(2);
    var mathEntryInteraction;

    // Warning: this is an experimental MathQuill API that might change or be removed upon MathQuill update.
    // Still, it is the most satisfying way to implement some required functionality without ugly hacks.
    MQ.registerEmbed('gap', function registerGap() {
        return {
            htmlString: '<span class="mq-tao-gap"></span>',
            text: function text() {
                return 'tao_gap';
            },
            latex: function latex() {
                return '\\taoGap';
            }
        };
    });

    mathEntryInteraction = {

        /**
         * Are we in a TAO QTI Creator context?
         */
        inQtiCreator: function isInCreator() {
            if (_.isUndefined(this._inQtiCreator) && this.$container) {
                this._inQtiCreator = this.$container.hasClass('tao-qti-creator-context');
            }
            return this._inQtiCreator;
        },

        inGapMode: function inGapMode() {
            return this.config.useGapExpression;
        },

        /**
         * Render PCI
         */
        render: function render(config) {
            this.initConfig(config);

            this.createToolbar();
            this.togglePlaceholder(false);

            // QtiCreator rendering of the PCI in Gap Expression mode: display a MathQuill editable field containing the gap expression
            if (this.inGapMode() && this.inQtiCreator()) {
                this.createMathEditable();
                this.setLatex(this.config.gapExpression);

                this.addToolbarListeners();
                this.addInputListeners();

            // QtiCreator rendering of the PCI: display the input field placeholder instead of an actual MathQuill editable field
            } else if (!this.inGapMode() && this.inQtiCreator()) {
                this.togglePlaceholder(true);

            // Normal rendering of the PCI in Gap Expression mode: render a static MathQuill field with editable gaps
            } else if (this.inGapMode() && !this.inQtiCreator()) {
                this.setMathStaticContent(this.config.gapExpression);
                this.createMathStatic();

                this.monitorActiveInnerField();
                this.addToolbarListeners();

            // Normal rendering of the PCI: display an empty MathQuill editable field
            } else {
                this.createMathEditable();

                this.addToolbarListeners();
                this.addInputListeners();
            }
        },

        /**
         * Initialise configuration
         *
         * @param {Object} config
         * @param {Boolean} config.tool_toolId - is the given tool enabled?
         */
        initConfig: function initConfig(config) {
            function toBoolean(value, defaultValue) {
                if (typeof(value) === "undefined") {
                    return defaultValue;
                } else {
                    return (value === true || value === "true");
                }
            }

            this.config = {
                toolsStatus: {
                    frac:     toBoolean(config.tool_frac,     true),
                    sqrt:     toBoolean(config.tool_sqrt,     true),
                    exp:      toBoolean(config.tool_exp,      true),
                    log:      toBoolean(config.tool_log,      true),
                    ln:       toBoolean(config.tool_ln,       true),
                    e:        toBoolean(config.tool_e,        true),
                    infinity: toBoolean(config.tool_infinity, true),
                    lbrack:   toBoolean(config.tool_lbrack,   true),
                    rbrack:   toBoolean(config.tool_rbrack,   true),
                    pi:       toBoolean(config.tool_pi,       true),
                    cos:      toBoolean(config.tool_cos,      true),
                    sin:      toBoolean(config.tool_sin,      true),
                    lte:      toBoolean(config.tool_lte,      true),
                    gte:      toBoolean(config.tool_gte,      true),
                    times:    toBoolean(config.tool_times,    true),
                    divide:   toBoolean(config.tool_divide,   true),
                    plusminus:toBoolean(config.tool_plusminus,true)
                },
                allowNewLine:        toBoolean(config.allowNewLine, false),
                authorizeWhiteSpace: toBoolean(config.authorizeWhiteSpace, false),
                useGapExpression:    toBoolean(config.useGapExpression, false),
                gapExpression:       config.gapExpression || ''
            };
        },

        /**
         *
         */
        togglePlaceholder: function togglePlaceholder(displayPlaceholder) {
            if (! this.$inputPlaceholder) {
                // this is not in the PCI markup for backward-compatibility reasons
                this.$inputPlaceholder  = $('<div>', {
                    'class': 'math-entry-placeholder'
                });
                this.$toolbar.after(this.$inputPlaceholder);
            }
            if (displayPlaceholder) {
                this.$input.hide();
                this.$inputPlaceholder.show();

            } else {
                this.$input.css({ display: 'block'}); // not using .show() on purpose, as it results in 'inline-block' instead of 'block'
                this.$inputPlaceholder.hide();
            }
        },

        setMathStaticContent: function setMathStaticContent(latex) {
            var regex = /\\taoGap/g;
            latex = latex.replace(regex, '\\MathQuillMathField{}');
            this.$input.text(latex);
        },

        createMathStatic: function createMathStatic() {
            var self = this,
                innerFields;

            this.mathField = MQ.StaticMath(this.$input.get(0));

            innerFields = this.getInnerFields();
            innerFields.forEach(function(field) {
                field.config(self.getMqConfig());
            });
        },

        getMqConfig: function getMqConfig() {
            var self = this;
            return {
                spaceBehavesLikeTab: !this.config.authorizeWhiteSpace,
                handlers: {
                    edit: function(mathField) {
                        self.trigger('responseChange', [mathField.latex()]);
                    }
                }
            };
        },

        monitorActiveInnerField: function monitorActiveInnerField() {
            var self = this,
                $editableFields = this.$input.find('.mq-editable-field');

            this._activeInnerFieldIndex = null;

            if ($editableFields.length) {
                $editableFields.each(function(index) {
                    $(this).on('click keyup', function() {
                        self._activeInnerFieldIndex = index;
                    });
                });
            }
        },

        /**
         * transform a DOM element into a MathQuill Field
         */
        createMathEditable: function createMathEditable() {
            if(this.mathField && this.mathField instanceof MathQuill){
                //if mathquill element already exists, update the config
                this.mathField.config(this.getMqConfig());
            }else{
                //if mathquill element does not exist yet, create it
                this.mathField = MQ.MathField(this.$input.get(0), this.getMqConfig());
            }
        },

        /**
         * Create the toolbar markup with event attached
         */
        createToolbar: function createToolbar() {
            var self = this,
                availableTools = {
                    frac:   { label: 'x/y',         latex: '\\frac',    fn: 'cmd',      desc: 'Fraction' },
                    sqrt:   { label: '&radic;',     latex: '\\sqrt',    fn: 'cmd',      desc: 'Square root' },
                    exp:    { label: 'x&#8319;',    latex: '^',         fn: 'cmd',      desc: 'Exponent' },
                    log:    { label: 'log',         latex: '\\log',     fn: 'write',    desc: 'Log' },
                    ln:     { label: 'ln',          latex: '\\ln',      fn: 'write',    desc: 'Ln' },
                    e:      { label: '&#8494;',     latex: '\\mathrm{e}',fn: 'write',   desc: 'Euler\'s constant' },
                    infinity: { label: '&#8734;',   latex: '\\infty',   fn: 'write',    desc: 'Infinity' },
                    lbrack: { label: '[',           latex: '\\lbrack',  fn: 'write',    desc: 'Left bracket' },
                    rbrack: { label: ']',           latex: '\\rbrack',  fn: 'write',    desc: 'Right bracket' },
                    pi:     { label: '&pi;',        latex: '\\pi',      fn: 'write',    desc: 'Pi' },
                    cos:    { label: 'cos',         latex: '\\cos',     fn: 'write',    desc: 'Cosinus' },
                    sin:    { label: 'sin',         latex: '\\sin',     fn: 'write',    desc: 'Sinus' },
                    lte:    { label: '&le;',        latex: '\\le',      fn: 'write',    desc: 'Lower than or equal' },
                    gte:    { label: '&ge;',        latex: '\\ge',      fn: 'write',    desc: 'Greater than or equal' },
                    times:  { label: '&times;',     latex: '\\times',   fn: 'cmd',      desc: 'Multiply' },
                    divide: { label: '&divide;',    latex: '\\div',     fn: 'cmd',      desc: 'Divide' },
                    plusminus: { label: '&#177;',   latex: '\\pm',      fn: 'write',    desc: 'Plus/minus' }
                },
                availableToolGroups = [ // we use an array to maintain order
                    { id: 'functions',  tools: ['sqrt', 'frac', 'exp', 'log', 'ln'] },
                    { id: 'symbols',    tools: ['e', 'infinity', 'lbrack', 'rbrack'] },
                    { id: 'trigo',      tools: ['pi', 'sin', 'cos'] },
                    { id: 'comparison', tools: ['lte', 'gte'] },
                    { id: 'operands',   tools: ['times', 'divide', 'plusminus'] }
                ];


            // create buttons
            this.$toolbar.empty();

            availableToolGroups.forEach(function (toolgroup) {
                self.$toolbar.append(createToolGroup(toolgroup));
            });

            /**
             * Create a group of buttons
             * @param {String} group - description of the toolgroup
             * @param {String} group.id
             * @param {Array} group.tools - ids of tools
             * @returns {JQuery|string} the created element or an empty string
             */
            function createToolGroup(group) {
                var $toolGroup = $('<div>', {
                        'class': 'math-entry-toolgroup',
                        'data-identifier': group.id
                    }),
                    activeTools = 0;

                group.tools.forEach(function(toolId) {
                    var toolConfig = availableTools[toolId];

                    toolConfig.id = toolId;
                    if (self.config.toolsStatus[toolId] === true) {
                        $toolGroup.append(createTool(toolConfig));
                        activeTools++;
                    }
                });

                return (activeTools > 0) ? $toolGroup : '';
            }

            /**
             * Create a single button
             * @param {Object} config
             * @param {String} config.id    - id of the tool
             * @param {String} config.latex - latex code to be generated
             * @param {String} config.fn    - Mathquill function to be called (ie. cmd or write)
             * @param {String} config.label - label of the rendered button
             * @returns {jQuery} - the created button
             */
            function createTool(config) {
                return $('<div>', {
                    'class': 'math-entry-tool',
                    'data-identifier': config.id,
                    'data-latex': config.latex,
                    'data-fn': config.fn,
                    html: config.label
                });
            }
        },

        addToolbarListeners: function addToolbarListeners() {
            var self = this;

            this.$toolbar
                .off('mousedown' + ns)
                .on('mousedown' + ns, function (e) {
                    var $target = $(e.target),
                        fn = $target.data('fn'),
                        latex = $target.data('latex');

                    e.stopPropagation();
                    e.preventDefault();

                    self.insertLatex(latex, fn);
                });
        },

        setLatex: function setLatex(latex) {
            var innerFields,
                regex = /\\taoGap/g;

            if (this.inGapMode() && _.isArray(latex)) {
                innerFields = this.getInnerFields();
                latex.forEach(function (latexExpr, i) {
                    if (innerFields[i]) {
                        innerFields[i].latex(latexExpr);
                    }
                });

            } else {
                latex = latex.replace(regex, '\\embed{gap}');
                this.mathField.latex(latex);
            }
        },

        insertLatex: function insertLatex(latex, fn) {
            var activeMathField = this.getActiveMathField();

            if (activeMathField) {
                switch (fn) {
                    case 'cmd':
                        activeMathField.cmd(latex);
                        break;
                    case 'write':
                        activeMathField.write(latex);
                        break;
                }
                activeMathField.focus();
            }
        },

        getActiveMathField: function getActiveMathField() {
            var activeMathField;

            if (this.inGapMode() && !this.inQtiCreator()) {
                // default to the first inner field if none has received the focus yet
                if (! _.isFinite(this._activeInnerFieldIndex)) {
                    this._activeInnerFieldIndex = 0;
                }
                // access the MQ instance
                if (this.getInnerFields().length > 0) {
                    activeMathField = this.mathField.innerFields[this._activeInnerFieldIndex];
                }
            } else {
                activeMathField =  this.mathField;
            }
            return activeMathField;
        },

        getInnerFields: function getInnerFields() {
            return (this.mathField && _.isArray(this.mathField.innerFields))
                ? this.mathField.innerFields
                : [];
        },

        addInputListeners: function addInputListeners() {
            var self = this;

            /**
             * Ugly hack to allow for a line break on enter
             * inspired by https://github.com/mathquill/mathquill/issues/174
             *
             * The latex will turn into the following markup:
             * <span class="mq-textcolor" style="color:newline"> </span>
             *
             * which, along with the following css:
             * .mq-textcolor[style="color:newline"] {
             *      display: block;
             * }
             *
             *  ...creates a newline!!!
             */
            this.$input
                .off('keypress' + ns)
                .on('keypress' + ns, function (e) {
                    var latex = '\\textcolor{newline}{ }';
                    if (self.config.allowNewLine && e.keyCode === 13) {
                        self.mathField.write(latex);
                    }
                });
        },

        addGap: function addGap() {
            var latex = '\\embed{gap}';
            this.insertLatex(latex, 'write');
        },


        /**
         * PCI public interface
         */

        id: -1,

        getTypeIdentifier: function getTypeIdentifier() {
            return 'mathEntryInteraction';
        },
        /**
         * Render the PCI :
         * @param {String} id
         * @param {Node} dom
         * @param {Object} config - json
         */
        initialize: function initialize(id, dom, config) {
            var self = this;

            event.addEventMgr(this);

            this.id = id;
            this.dom = dom;

            this.$container         = $(dom);
            this.$toolbar           = this.$container.find('.toolbar');
            this.$input             = this.$container.find('.math-entry-input');

            this.render(config);

            //tell the rendering engine that I am ready
            qtiCustomInteractionContext.notifyReady(this);

            this.on('configChange', function (newConfig) {
                self.render(newConfig);
            });

            this.on('addGap', function () {
                self.addGap();
            });

            // render rich text content in prompt
            html.render(this.$container.find('.prompt'));
        },
        /**
         * Programmatically set the response following the json schema described in
         * http://www.imsglobal.org/assessment/pciv1p0cf/imsPCIv1p0cf.html#_Toc353965343
         *
         * @param {Object} interaction
         * @param {Object} response
         */
        setResponse: function setResponse(response) {
            if (this.inGapMode()) {
                if (response && response.list && _.isArray(response.list.string)) {
                    this.setLatex(response.list.string);
                }

            } else {
                if (response && response.base && response.base.string) {
                    this.setLatex(response.base.string);
                }
            }
        },
        /**
         * Get the response in the json format described in
         * http://www.imsglobal.org/assessment/pciv1p0cf/imsPCIv1p0cf.html#_Toc353965343
         *
         * @param {Object} interaction
         * @returns {Object}
         */
        getResponse: function getResponse() {
            var response;

            if (this.inGapMode()) {
                response = {
                    list: {
                        string: this.getInnerFields().map(function(innerField) {
                            return innerField.latex();
                        })
                    }
                };
            } else {
                response = {
                    base: {
                        string : this.mathField.latex()
                    }
                };
            }
            return response;
        },
        /**
         * Remove the current response set in the interaction
         * The state may not be restored at this point.
         *
         * @param {Object} interaction
         */
        resetResponse: function resetResponse() {
            var innerFields = this.getInnerFields();
            if (this.inGapMode()) {
                innerFields.forEach(function(innerField) {
                    innerField.latex('');
                });
            } else {
                this.setLatex('');
            }
        },
        /**
         * Reverse operation performed by render()
         * After this function is executed, only the inital naked markup remains
         * Event listeners are removed and the state and the response are reset
         *
         * @param {Object} interaction
         */
        destroy: function destroy() {
            this.$toolbar.off(ns);
            this.$input.off(ns);
            this.resetResponse();
            this.mathField.revert();
        },
        /**
         * Restore the state of the interaction from the serializedState.
         *
         * @param {Object} interaction
         * @param {Object} state - json format
         */
        setSerializedState: function setSerializedState(state) {
            this.setResponse(state);
        },

        /**
         * Get the current state of the interaction as a string.
         * It enables saving the state for later usage.
         *
         * @param {Object} interaction
         * @returns {Object} json format
         */
        getSerializedState: function getSerializedState() {
            return this.getResponse();
        }
    };

    qtiCustomInteractionContext.register(mathEntryInteraction);
});