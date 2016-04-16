/*:
 * @plugindesc v1.0 Perform actions like messages during Victory Aftermath
 * @author DreamX
 *
 * @param Always Use VX-Ace Style EXP Window
 * @desc Always use the VX-Ace style exp window even if there is no message to display. Default: false
 * @default false
 *
 * @param VX-Ace Style EXP Text
 * @desc When VX-Ace Style EXP window is used, this is used for the exp gained label. Default: EXP
 * @default EXP
 *
 * @help
 * //===========================================================================
 * // Notetags
 * //===========================================================================
 * You must use notetags in order to have actions during the victory aftermath 
 * windows. Victory actions for the exp and drop windows may be put in any 
 * actor's notebox, but actions for the level up windows (that Yanfly's 
 * Aftermath Level Up extension provides) must be put into the notebox of the 
 * actor associated. For example, if you want an action to occur when Harold 
 * levels up, you must put that action in his notebox.
 * 
 * <VICTORY ACTION TYPE: x>
 * This notetag is required. Replace x with the type of window where this action 
 * will be performed. There are three options: exp, level, and drop. 
 * Example: 
 * <VICTORY ACTION TYPE: drop>
 * 
 * <VICTORY ACTION CONDITION>
 * x
 * </VICTORY ACTION CONDITION>
 * This notetag set is optional, but you need it if you want to set special 
 * conditions for an action to occur. Replace x with a script condition.
 * Example:
 * <VICTORY ACTION CONDITION>
 * $gameSwitches.value(1)
 * </VICTORY ACTION CONDITION>
 * The condition in this example is that the switch 1 is on.
 * 
 * <VICTORY ACTION PRIORITY>
 * x
 * </VICTORY ACTION PRIORITY>
 * This notetag set is optional. Replace x with a script. This is the priority  
 * for the action. If there is more than one action that passes its condition, 
 * this plugin will test the action's priority and choose the one with the 
 * highest priority if possible. If there is more than one action with the 
 * highest condition, a random one of those actions will be selected. By 
 * default, every action's priority is 0, but you can override it with this 
 * notetag set.
 * Example:
 * <VICTORY ACTION PRIORITY>
 * $gameVariables.value(1)
 * </VICTORY ACTION PRIORITY>
 * This script will set the priority of the action to be the value of variable 
 * 1. 
 * 
 * <VICTORY ACTION NO MESSAGE>
 * This notetag is optional. If you use this for an action, it will not shorten 
 * the Victory Aftermath windows in order to accomodate a message window. This 
 * is useful for any action that does not cause a message to appear. Note that 
 * if at least one level up action that will occur during the level up window 
 * is not set with this notetag, the level up window will still be shortened to 
 * accomodate for a message.
 * 
 * <VICTORY ACTION EFFECT>
 * x
 * </VICTORY ACTION EFFECT>
 * This notetag set is required. Replace x with a script. This is the effect 
 * performed when the action occurs. This notetag set also closes parsing for 
 * this action, meaning this needs to be the last notetag for the action. After 
 * this, you can start defining more actions in the same notebox.
 * Example:
 * <VICTORY ACTION EFFECT>
 * console.log("Hello World");
 * </VICTORY ACTION EFFECT>
 * 
 * //===========================================================================
 * // Script calls provided by this plugin
 * //===========================================================================
 * To assist people in creating conditions or effects for an action, a couple 
 * functions are provided by this plugin for that purpose. This should be 
 * especially useful for people without much javascript experience.
 * 
 * this.DXVACommonEvent("x") - Replace x with a common event id(s). This will 
 * cause a common event to occur. You can use commas (for separate ids) or 
 * dashes (for ranges) for multiple ids. A random common event of the ones 
 * passed to this function will be chosen.
 * Example:
 * this.DXVACommonEvent("1-3, 7");
 * In this example, common event 1, 2, 3 or 7 will be chosen to occur.
 * 
 * this.DXVADropsHasTag("x") - Replace with a notetag name. This function 
 * returns whether one of the battle drops has a notetag. In other words, it 
 * can be used as a condition.
 * Example:
 * this.DXVADropsHasTag("IsPotion");
 * In this example, the condition is that one of the battle drops has a notetag 
 * named IsPotion, for example, <IsPotion:1>
 * 
 * this.DXVAEnemiesHasTag("x") - Replace with a notetag name. This function 
 * returns whether one of the enemies had a notetag. In other words, it 
 * can be used as a condition.
 * Example:
 * this.DXVAEnemiesHasTag("IsImp");
 * In this example, the condition is that one of the battle drops has a notetag 
 * named IsImp, for example, <IsImp:1>
 * 
 * If you require javascript assistance, I recommend either asking in the 
 * thread for this plugin or in the javascript help section.
 * ===========================================================================
 * Terms Of Use
 * ===========================================================================
 * Free to use and modify for commercial and noncommercial games, with credit.
 * ===========================================================================
 * Compatibility
 * ===========================================================================
 * Set under Yanfly plugins.
 * ===========================================================================
 * Credits
 * ===========================================================================
 * DreamX
 * Thanks to Yanfly for the original plugin which this is an extension of.
 */

var Imported = Imported || {};
Imported.DreamX_VictoryAftermath = true;

var DreamX = DreamX || {};
DreamX.VictoryAftermath = DreamX.VictoryAftermath || {};

(function () {
//=============================================================================
// Parameters
//=============================================================================
    var parameters = PluginManager.parameters('DreamX_Ext_VictoryAftermath');

    var paramQuoteEXPLabelText = String(parameters['VX-Ace Style EXP Text']
            || "EXP");
    var paramAlwaysVXACEExp = eval(parameters['Always Use VX-Ace Style EXP Window']
            || false);
    var paramAlwaysShortWindows = false;

//=============================================================================
// DataManager
//=============================================================================
    DreamX.VictoryAftermath.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function () {
        if (!DreamX.VictoryAftermath.DataManager_isDatabaseLoaded.call(this))
            return false;
        if (!DreamX.VictoryAftermathLoaded) {
            this.processDXVAActorNotetags($dataActors);
            DreamX.VictoryAftermathLoaded = true;
        }
        return true;
    };

    DataManager.processDXVAActorNotetags = function (data) {
        var evalMode = 'none';
        var conditionScript = "";
        var effectScript = "";
        var appearanceType = "";
        var priorityScript = "";
        var isMessage = true;
        var actorID = 0;

        DreamX.VictoryAftermath.ExpActions = [];
        DreamX.VictoryAftermath.DropActions = [];
        DreamX.VictoryAftermath.LevelActions = [];

        for (var i = 0; i < data.length; i++) {
            var actor = data[i];
            if (!actor)
                continue;
            var notedata = actor.note.split(/[\r\n]+/);
            for (var j = 0; j < notedata.length && !evalMode.match('finish'); j++) {
                var line = notedata[j];
                if (line.match(/<(?:VICTORY ACTION CONDITION)>/i)) {
                    evalMode = 'condition';
                } else if (line.match(/<\/(?:VICTORY ACTION CONDITION)>/i)) {
                    evalMode = 'none';
                } else if (line.match(/<(?:VICTORY ACTION PRIORITY)>/i)) {
                    evalMode = 'priority';
                } else if (line.match(/<\/(?:VICTORY ACTION PRIORITY)>/i)) {
                    evalMode = 'none';
                } else if (line.match(/<(?:VICTORY ACTION EFFECT)>/i)) {
                    evalMode = 'effect';
                } else if (line.match(/<\/(?:VICTORY ACTION EFFECT)>/i)) {
                    evalMode = 'finish';
                } else if (line.match(/<(?:VICTORY ACTION TYPE):(.*)>/i)) {
                    appearanceType = String(RegExp.$1).trim().toLowerCase();
                } else if (line.match(/<VICTORY ACTION NO MESSAGE>/i)) {
                    isMessage = false;
                } else if (evalMode === 'condition') {
                    conditionScript += line + '\n';
                } else if (evalMode === 'effect') {
                    effectScript += line + '\n';
                } else if (evalMode === 'priority') {
                    priorityScript += line + '\n';
                }

                if (evalMode === 'finish') {
                    var valid = true;
                    // must have an appearance type
                    if (!appearanceType.match("exp")
                            && !appearanceType.match("drop")
                            && !appearanceType.match("level")) {
                        valid = false;
                    }

                    // must have an effect
                    if (effectScript.length === 0) {
                        valid = false;
                    }

                    // if set to level, the actor currently being processed
                    // will be set in the obect
                    if (appearanceType.match("level")) {
                        actorID = i;
                    }

                    if (valid === true) {
                        // default priority is 0
                        if (priorityScript.length === 0) {
                            priorityScript = 0;
                        }
                        // default condition is true, meaning it's always enabled
                        if (conditionScript.length === 0) {
                            conditionScript = "true";
                        }
                        var action = {type: appearanceType, condition: conditionScript,
                            effect: effectScript, priority: priorityScript,
                            actorID: actorID, isMessage: isMessage};

                        if (appearanceType.match("exp")) {
                            DreamX.VictoryAftermath.ExpActions.push(action);
                        } else if (appearanceType.match("drop")) {
                            DreamX.VictoryAftermath.DropActions.push(action);
                        } else if (appearanceType.match("level")) {
                            DreamX.VictoryAftermath.LevelActions.push(action);
                        }
                    }

                    evalMode = 'none';
                    conditionScript = "";
                    effectScript = "";
                    appearanceType = "";
                    priorityScript = "";
                    actorID = 0;
                    isMessage = true;
                }
            }

        }
    };

//=============================================================================
// Window_Message
//=============================================================================
    DreamX.VictoryAftermath.Window_Message_isTriggered = Window_Message.prototype.isTriggered;
    Window_Message.prototype.isTriggered = function () {
        var scene = SceneManager._scene;
        if (scene instanceof Scene_Battle) {
            var victoryExpWindow = scene._victoryExpWindow;
            if (victoryExpWindow && !victoryExpWindow.isReady()) {
                return false;
            }
        }
        return DreamX.VictoryAftermath.Window_Message_isTriggered.call(this);
    };

//=============================================================================
// Scene_Battle
//=============================================================================
    Scene_Battle.prototype.DXVAEnemiesHasTag = function (metaTag) {
        return $gameTroop._enemies.some(function (enemy) {
            return enemy.enemy().meta.hasOwnProperty(metaTag);
        });
    };

    Scene_Battle.prototype.DXVADropsHasTag = function (metaTag) {
        return BattleManager._rewards.items.some(function (reward) {
            return reward.meta.hasOwnProperty(metaTag);
        });
    };

    Scene_Battle.prototype.DXVACommonEvent = function (data) {
        var CEArray = [];
        var CESplit = data.trim().replace(/,/g, " ").split(new RegExp("\\s{1,}"));

        for (var i = 0; i < CESplit.length; i++) {
            var word = CESplit[i];
            if (word.indexOf("-") !== -1) {
                var start = word.split("-")[0];
                var end = word.split("-")[1];

                start = parseInt(start);
                end = parseInt(end);

                for (var j = start; j <= end; j++) {
                    CEArray.push(j);
                }
            } else {
                CEArray.push(parseInt(word));
            }
        }

        var CEID = CEArray[ Math.floor(Math.random() * CEArray.length) ];

        $gameTroop._interpreter.setup($dataCommonEvents[CEID].list);
    };

    Scene_Battle.prototype.DXVADecideAction = function (array, actorID) {
        var validEffects = [];
        var priorityEffects = [];
        for (var i = 0; i < array.length; i++) {
            var effectObj = array[i];
            if (actorID !== 0 && actorID !== effectObj.actorID) {
                continue;
            }
            if (eval(effectObj.condition)) {
                validEffects.push(effectObj);
            }
        }

        if (validEffects.length === 0) {
            return undefined;
        }

        var highestPriority = 0;
        for (var i = 0; i < validEffects.length; i++) {
            var currentEffect = validEffects[i];
            var currentPriority = parseInt(eval(currentEffect.priority));
            if (currentPriority === highestPriority) {
                priorityEffects.push(currentEffect);
            } else if (currentPriority > highestPriority) {
                priorityEffects = [];
                priorityEffects.push(currentEffect);
            }
        }

        var chosenEffect = priorityEffects[ Math.floor(Math.random() * priorityEffects.length) ];
        return chosenEffect;
    };

    Scene_Battle.prototype.DXVAGetAction = function (array, actorID) {
        if (!array || array.length === 0)
            return false;
        var id = actorID ? actorID : 0;
        var action = this.DXVADecideAction(array, id);

        if (action) {
            return action;
        }
        return false;
    };

    Scene_Battle.prototype.DXVAExecuteAction = function (action) {
        eval(action.effect);
    };

    DreamX.VictoryAftermath.Scene_Battle_victoryTriggerContinue = Scene_Battle.prototype.victoryTriggerContinue;
    Scene_Battle.prototype.victoryTriggerContinue = function () {
        if ($gameTroop._interpreter.isRunning() === true) {
            $gameTemp.DXVAMessageWasRunningEvent = true;
            return false;
        } else if ($gameTemp.DXVAMessageWasRunningEvent === true) {
            $gameTemp.DXVAMessageWasRunningEvent = false;
            return true;
        }
        return DreamX.VictoryAftermath.Scene_Battle_victoryTriggerContinue.call(this);
    };

    DreamX.VictoryAftermath.Scene_Battle_updateVictorySteps = Scene_Battle.prototype.updateVictorySteps;
    Scene_Battle.prototype.updateVictorySteps = function () {
        if (!this._DXVAAddedChoiceWindow) {
            this._DXVAAddedChoiceWindow = true;
            SceneManager._scene.addChild(SceneManager._scene._messageWindow._choiceWindow);
        }
        DreamX.VictoryAftermath.Scene_Battle_updateVictorySteps.call(this);
    };

    DreamX.VictoryAftermath.Scene_Battle_createVictoryExp = Scene_Battle.prototype.createVictoryExp;
    Scene_Battle.prototype.createVictoryExp = function () {
        var action = this.DXVAGetAction(DreamX.VictoryAftermath.ExpActions);

        $gameTemp._EXPWindowMessage = false;

        if (action) {
            $gameTemp._EXPWindowMessage = action.isMessage;
            this.DXVAExecuteAction(action);
        }
        DreamX.VictoryAftermath.Scene_Battle_createVictoryExp.call(this);
    };

    DreamX.VictoryAftermath.Scene_Battle_createVictoryDrop = Scene_Battle.prototype.createVictoryDrop;
    Scene_Battle.prototype.createVictoryDrop = function () {
        var action = this.DXVAGetAction(DreamX.VictoryAftermath.DropActions);

        $gameTemp._DropWindowMessage = false;

        if (action) {
            $gameTemp._DropWindowMessage = action.isMessage;
            this.DXVAExecuteAction(action);
        }

        DreamX.VictoryAftermath.Scene_Battle_createVictoryDrop.call(this);
    };

//=============================================================================
// Window_VictoryExp
//=============================================================================
    Window_VictoryExp.prototype.shouldUseVXAceStyleEXP = function () {
        if (paramAlwaysVXACEExp === true) {
            return true;
        }
        if ($gameTemp._EXPWindowMessage === true) {
            return true;
        }

        return false;
    };

    Window_VictoryExp.prototype.shouldUseShortWindow = function () {
        if ($gameTemp._EXPWindowMessage === true) {
            return true;
        }
        return false;
    };

    DreamX.VictoryAftermath.Window_VictoryExp_maxItems = Window_VictoryExp.prototype.maxItems;
    Window_VictoryExp.prototype.maxItems = function () {
        if (this.shouldUseVXAceStyleEXP() === true) {
            return $gameParty.battleMembers().length;
        }
        return DreamX.VictoryAftermath.Window_VictoryExp_maxItems.call(this);
    };

    DreamX.VictoryAftermath.Window_VictoryExp_maxCols = Window_VictoryExp.prototype.maxCols;
    Window_VictoryExp.prototype.maxCols = function () {
        if (this.shouldUseVXAceStyleEXP() === true) {
            return this.maxItems();
        }
        return DreamX.VictoryAftermath.Window_VictoryExp_maxCols.call(this);
    };

    DreamX.VictoryAftermath.Window_VictoryExp_windowHeight = Window_VictoryExp.prototype.windowHeight;
    Window_VictoryExp.prototype.windowHeight = function () {
        if (this.shouldUseShortWindow() === true) {
            return Graphics.boxHeight - this.fittingHeight(1) - Window_Message.prototype.windowHeight();
        }
        return DreamX.VictoryAftermath.Window_VictoryExp_windowHeight.call(this);
    };

    if (!Window_VictoryExp.prototype.itemWidth) {
        Window_VictoryExp.prototype.itemWidth = function () {
            return Window_Selectable.prototype.itemWidth.call(this);
        };
    }

    DreamX.VictoryAftermath.Window_VictoryExp_itemWidth = Window_VictoryExp.prototype.itemWidth;
    Window_VictoryExp.prototype.itemWidth = function () {
        if (this.shouldUseVXAceStyleEXP() === true) {
            return Math.floor(this.contentsWidth() / this.maxItems());
        }
        return DreamX.VictoryAftermath.Window_VictoryExp_itemWidth.call(this);
    };

    if (!Window_VictoryExp.prototype.itemHeight) {
        Window_VictoryExp.prototype.itemHeight = function () {
            return Window_Selectable.prototype.itemHeight.call(this);
        };
    }

    DreamX.VictoryAftermath.Window_VictoryExp_itemHeight = Window_VictoryExp.prototype.itemHeight;
    Window_VictoryExp.prototype.itemHeight = function () {
        if (this.shouldUseVXAceStyleEXP() === true) {
            return this.contentsHeight();
        }
        return DreamX.VictoryAftermath.Window_VictoryExp_itemHeight.call(this);
    };

    if (!Window_VictoryExp.prototype.spacing) {
        Window_VictoryExp.prototype.spacing = function () {
            return Window_Selectable.prototype.spacing.call(this);
        };
    }

    DreamX.VictoryAftermath.Window_VictoryExp_spacing = Window_VictoryExp.prototype.spacing;
    Window_VictoryExp.prototype.spacing = function () {
        return 0;
    };

    DreamX.VictoryAftermath.Window_VictoryExp_drawActorProfile = Window_VictoryExp.prototype.drawActorProfile;
    Window_VictoryExp.prototype.drawActorProfile = function (actor, index) {
        if (this.shouldUseVXAceStyleEXP() === false) {
            return DreamX.VictoryAftermath.Window_VictoryExp_drawActorProfile.call(this, actor, index);
        }
        var rect = this.itemRect(index);
        var x = this.quoteFaceX(rect);
        var y = this.quoteFaceY();

        this.drawActorFace(actor, x, y);
    };

    Window_VictoryExp.prototype.quoteFaceX = function (rect) {
        return rect.x + (this.itemWidth() / 2) - (Window_Base._faceWidth / 2);
    };

    Window_VictoryExp.prototype.quoteFaceY = function () {
        return Math.floor((this.windowHeight() / 2)
                - this.standardPadding() - Window_Base._faceHeight * .66);
    };

    DreamX.VictoryAftermath.Window_VictoryExp_drawActorGauge = Window_VictoryExp.prototype.drawActorGauge;
    Window_VictoryExp.prototype.drawActorGauge = function (actor, index) {
        if (this.shouldUseVXAceStyleEXP() === false) {
            return DreamX.VictoryAftermath.Window_VictoryExp_drawActorGauge.call(this, actor, index);
        }

        var rect = this.itemRect(index);
        this.contents.clearRect(rect.x, this.quoteFaceY() + Window_Base._faceHeight, rect.width, rect.height);

        var x = this.quoteFaceX(rect);
        var y = this.quoteFaceY() - this.lineHeight();

        this.changeTextColor(this.hpColor(actor));
        this.drawText(actor.name(), x, y, Window_Base._faceWidth, 'center');
        this.resetFontSettings();

        this.drawLevel(actor, rect);
        this.drawExpGauge(actor, rect);
        this.drawExpValues(actor, rect);
        this.drawExpGained(actor, rect);
    };

    DreamX.VictoryAftermath.Window_VictoryExp_drawExpGauge = Window_VictoryExp.prototype.drawExpGauge;
    Window_VictoryExp.prototype.drawExpGauge = function (actor, rect) {
        if (this.shouldUseVXAceStyleEXP() === false) {
            return DreamX.VictoryAftermath.Window_VictoryExp_drawExpGauge.call(this, actor, rect);
        }

        var rate = this.actorExpRate(actor);
        if (rate >= 1.0) {
            var color1 = this.textColor(Yanfly.Param.ColorLv1);
            var color2 = this.textColor(Yanfly.Param.ColorLv2);
        } else {
            var color1 = this.textColor(Yanfly.Param.ColorExp1);
            var color2 = this.textColor(Yanfly.Param.ColorExp2);
        }
        var x = this.quoteFaceX(rect);
        var y = this.quoteFaceY() + Window_Base._faceHeight;

        this.drawGauge(x, y, Window_Base._faceWidth, rate, color1, color2);
    };

    DreamX.VictoryAftermath.Window_VictoryExp_drawLevel = Window_VictoryExp.prototype.drawLevel;
    Window_VictoryExp.prototype.drawLevel = function (actor, rect) {
        if (this.shouldUseVXAceStyleEXP() === false) {
            return  DreamX.VictoryAftermath.Window_VictoryExp_drawLevel.call(this, actor, rect);
        }
        this.changeTextColor(this.normalColor());
        if (this.actorExpRate(actor) >= 1.0) {
            var text = Yanfly.Util.toGroup(actor._postVictoryLv);
        } else {
            var text = Yanfly.Util.toGroup(actor._preVictoryLv);
        }

        var x = this.quoteFaceX(rect);
        var y = this.quoteFaceY() + Window_Base._faceHeight + (this.lineHeight() * 2);

        this.drawText(text, x, y, Window_Base._faceWidth, 'right');

        this.changeTextColor(this.systemColor());
        this.drawText(TextManager.levelA, x, y, Window_Base._faceWidth);
    };

    DreamX.VictoryAftermath.Window_VictoryExp_drawExpGained = Window_VictoryExp.prototype.drawExpGained;
    Window_VictoryExp.prototype.drawExpGained = function (actor, rect) {
        if (this.shouldUseVXAceStyleEXP() === false) {
            return DreamX.VictoryAftermath.Window_VictoryExp_drawExpGained.call(this, actor, rect);
        }
        var x = this.quoteFaceX(rect);
        var y = this.quoteFaceY() + Window_Base._faceHeight + (this.lineHeight());

        this.changeTextColor(this.systemColor());
        this.drawText(paramQuoteEXPLabelText, x, y, Window_Base._faceWidth,
                'left');

        var bonusExp = 1.0 * actor._expGained * this._tick /
                Yanfly.Param.VAGaugeTicks;
        var expParse = Yanfly.Util.toGroup(parseInt(bonusExp));
        var expText = Yanfly.Param.VAGainedExpfmt.format(expParse);
        this.changeTextColor(this.normalColor());

        this.drawText(expText, x, y, Window_Base._faceWidth, 'right');
    };

    DreamX.VictoryAftermath.Window_VictoryExp_drawExpValues = Window_VictoryExp.prototype.drawExpValues;
    Window_VictoryExp.prototype.drawExpValues = function (actor, rect) {
        if (this.shouldUseVXAceStyleEXP() === false) {
            return DreamX.VictoryAftermath.Window_VictoryExp_drawExpValues.call(this, actor, rect);
        }
        var wy = rect.y + this.lineHeight();
        var actorLv = actor._preVictoryLv;
        var bonusExp = 1.0 * actor._expGained * this._tick /
                Yanfly.Param.VAGaugeTicks;
        var nowExp = actor._preVictoryExp - actor.expForLevel(actorLv) + bonusExp;
        var nextExp = actor.expForLevel(actorLv + 1) - actor.expForLevel(actorLv);

        var expRatio = Math.floor((nowExp / nextExp) * 100);

        if (actorLv === actor.maxLevel()) {
            var text = Yanfly.Param.VAMaxLv;
        } else if (nowExp >= nextExp) {
            var text = Yanfly.Param.VALevelUp;
        } else {
            var text = expRatio + "%";
        }

        var x = this.quoteFaceX(rect);
        var y = this.quoteFaceY() + Window_Base._faceHeight;

        this.changeTextColor(this.normalColor());
        this.drawText(text, x, y, Window_Base._faceWidth, 'center');
    };

//=============================================================================
// Window_VictoryDrop
//=============================================================================
    Window_VictoryDrop.prototype.shouldUseShortWindow = function () {
        if ($gameTemp._DropWindowMessage === true) {
            return true;
        }
        return false;
    };

    DreamX.VictoryAftermath.Window_VictoryDrop_initialize = Window_VictoryDrop.prototype.initialize;
    Window_VictoryDrop.prototype.initialize = function (titleWindow) {
        DreamX.VictoryAftermath.Window_VictoryDrop_initialize.call(this, titleWindow);
        if (this.shouldUseShortWindow() === true) {
            var wy = titleWindow.height;
            var wh = Graphics.boxHeight - wy;
            this.height = wh - Window_Message.prototype.windowHeight();
        }
    };

//=============================================================================
// Window_VictoryLevelUp
//=============================================================================
    if (Imported.YEP_X_AftermathLevelUp) {
        DreamX.VictoryAftermath.BattleManager_prepareVictoryPostLevel = BattleManager.prepareVictoryPostLevel;
        BattleManager.prepareVictoryPostLevel = function () {
            DreamX.VictoryAftermath.BattleManager_prepareVictoryPostLevel.call(this);
            $gameTemp._LevelWindowMessage = false;
            $gameTemp._pendingLevelActions = [];
            var isMatch = false;
            var scene = SceneManager._scene;

            for (var i = 0; i < this._leveledActors.length && !isMatch; i++) {
                var actor = this._leveledActors[i];
                var id = actor.actorId();
                actor._levelUpAction = undefined;

                var action = scene.DXVAGetAction(DreamX.VictoryAftermath.LevelActions, id);
                if (action) {
                    actor._levelUpAction = action;
                    if (action.isMessage) {
                        $gameTemp._LevelWindowMessage = true;
                    }
                }
            }
        };

        Window_VictoryLevelUp.prototype.shouldUseShortWindow = function () {
            if ($gameTemp._LevelWindowMessage === true) {
                return true;
            }
            return false;
        };

        DreamX.VictoryAftermath.Window_VictoryLevelUp_windowHeight = Window_VictoryLevelUp.prototype.windowHeight;
        Window_VictoryLevelUp.prototype.windowHeight = function () {
            if (this.shouldUseShortWindow() === false) {
                return DreamX.VictoryAftermath.Window_VictoryLevelUp_windowHeight.call(this);
            }
            return Graphics.boxHeight - this.fittingHeight(1) - Window_Message.prototype.windowHeight();
        };

        DreamX.VictoryAftermath.Window_VictoryLevelUp_setActor = Window_VictoryLevelUp.prototype.setActor;
        Window_VictoryLevelUp.prototype.setActor = function (actor) {
            DreamX.VictoryAftermath.Window_VictoryLevelUp_setActor.call(this, actor);
            var scene = SceneManager._scene;
            var action = actor._levelUpAction;
            if (action) {
                scene.DXVAExecuteAction(action);
            }
        };

    }

})();