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
 * Copyright (c) 2017-2022 (original work) Open Assessment Technologies SA;
 */
define([
    'lodash',
    'i18n',
    'jquery',
    'module',
    'taoQtiItem/qtiCreator/widgets/states/factory',
    'taoQtiItem/qtiCreator/widgets/interactions/states/Question',
    'taoQtiItem/qtiCreator/widgets/helpers/formElement',
    'taoQtiItem/qtiCreator/widgets/helpers/pciMediaManager/pciMediaManager',
    'taoQtiItem/qtiCreator/editor/simpleContentEditableElement',
    'tpl!audioRecordingInteraction/creator/tpl/propertiesForm',
    'util/typeCaster'
], function (
    _,
    __,
    $,
    module,
    stateFactory,
    Question,
    formElement,
    pciMediaManagerFactory,
    simpleEditor,
    formTpl,
    typeCaster
) {
    'use strict';

    var AudioRecordingInteractionStateQuestion = stateFactory.extend(
        Question,
        function create() {},
        function destroy() {
            var $container = this.widget.$container;

            simpleEditor.destroy($container);
        }
    );

    /**
     * Change callback of form values
     * @param {Object} interaction
     * @param {*} value
     * @param {String} name
     */
    function configChangeCallBack(interaction, value, name) {
        interaction.prop(name, value);
        interaction.triggerPci('configChange', [interaction.getProperties()]);
    }

    AudioRecordingInteractionStateQuestion.prototype.initForm = function initForm() {
        var _widget = this.widget,
            $form = _widget.$form,
            interaction = _widget.element,
            response = interaction.getResponseDeclaration(),
            $compressedOptions,
            $uncompressedOptions,
            $delayOptions;

        var pciMediaManager = pciMediaManagerFactory(_widget);

        //render the form using the form template
        $form.html(
            formTpl(
                _.defaults({}, module.config(), {
                    serial: response.serial,
                    identifier: interaction.attr('responseIdentifier'),

                    allowPlayback: typeCaster.strToBool(interaction.prop('allowPlayback'), true),
                    autoStart: typeCaster.strToBool(interaction.prop('autoStart'), false),
                    autoPlayback: typeCaster.strToBool(interaction.prop('autoPlayback'), false),

                    delayMinutes: interaction.prop('delayMinutes'),
                    delaySeconds: interaction.prop('delaySeconds'),

                    maxRecords: interaction.prop('maxRecords'),
                    maxRecordingTime: interaction.prop('maxRecordingTime'),

                    isCompressed: typeCaster.strToBool(interaction.prop('isCompressed'), true),
                    audioBitrate: interaction.prop('audioBitrate'),
                    isStereo: typeCaster.strToBool(interaction.prop('isStereo'), false),

                    updateResponsePartially: typeCaster.strToBool(interaction.prop('updateResponsePartially'), true),
                    partialUpdateInterval: parseInt(interaction.prop('partialUpdateInterval'), 10) / 1000,

                    displayDownloadLink: typeCaster.strToBool(interaction.prop('displayDownloadLink'), false)
                })
            )
        );

        $compressedOptions = $form.find('[data-role="compressedOptions"]');
        $uncompressedOptions = $form.find('[data-role="uncompressedOptions"]');

        $delayOptions = $form.find('[data-role="delayOptions"]');

        //init form javascript
        formElement.initWidget($form);

        //init data change callbacks
        formElement.setChangeCallbacks(
            $form,
            interaction,
            _.assign(
                {
                    identifier: function identifier(i, value) {
                        response.id(value);
                        interaction.attr('responseIdentifier', value);
                    },

                    allowPlayback: configChangeCallBack,

                    autoStart: function autoStart(boundInteraction, value, name) {
                        if (value) {
                            $delayOptions.show();
                        } else {
                            $delayOptions.hide();
                        }
                        configChangeCallBack(boundInteraction, value, name);
                    },
                    autoPlayback: configChangeCallBack,

                    delayMinutes: configChangeCallBack,
                    delaySeconds: configChangeCallBack,

                    maxRecords: configChangeCallBack,
                    maxRecordingTime: configChangeCallBack,

                    isCompressed: function isCompressed(boundInteraction, value, name) {
                        if (value === 'true') {
                            $uncompressedOptions.hide();
                            $compressedOptions.show();
                        } else {
                            $uncompressedOptions.show();
                            $compressedOptions.hide();
                        }
                        configChangeCallBack(boundInteraction, value, name);
                    },
                    audioBitrate: configChangeCallBack,
                    isStereo: configChangeCallBack,

                    partialUpdateInterval: function partialUpdateInterval(boundInteraction, value, name) {
                        value = parseFloat(value) * 1000;
                        configChangeCallBack(boundInteraction, value, name);
                    },

                    displayDownloadLink: configChangeCallBack
                },
                pciMediaManager.getChangeCallbacks()
            )
        );

        pciMediaManager.init();
    };

    return AudioRecordingInteractionStateQuestion;
});
