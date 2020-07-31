/*
 * (c) Copyright Ascensio System SIA 2010-2019
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

"use strict";

(function (window, undefined) {
	/*
	 * Import
	 * -----------------------------------------------------------------------------
	 */
	var EDataValidationType = {
		None: 0,
		Custom: 1,
		Date: 2,
		Decimal: 3,
		List: 4,
		TextLength: 5,
		Time: 6,
		Whole: 7
	};
	var EDataValidationErrorStyle = {
		Stop: 0,
		Warning: 1,
		Information: 2
	};
	var EDataValidationImeMode = {
		NoControl: 0,
		Off: 1,
		On: 2,
		Disabled: 3,
		Hiragana: 4,
		FullKatakana: 5,
		HalfKatakana: 6,
		FullAlpha: 7,
		HalfAlpha: 8,
		FullHangul: 9,
		HalfHangul: 10
	};
	var EDataValidationOperator = {
		Between: 0,
		NotBetween: 1,
		Equal: 2,
		NotEqual: 3,
		LessThan: 4,
		LessThanOrEqual: 5,
		GreaterThan: 6,
		GreaterThanOrEqual: 7
	};

	function checkIntegerType(val) {
		return val && AscCommonExcel.cElementType.number === val.type;
	}

	function CDataFormula(value) {
		this.text = value;
		this._formula = null;
	}

	CDataFormula.prototype._init = function (ws) {
		if (this._formula || !this.text) {
			return;
		}

		this._formula = new AscCommonExcel.parserFormula(this.text, this, ws);
		this._formula.parse();
        this._formula.buildDependencies();
	};
    CDataFormula.prototype.onFormulaEvent = function (type, eventData) {
        if (AscCommon.c_oNotifyParentType.ChangeFormula === type) {
            this.text = eventData.assemble;
        }
    };
	CDataFormula.prototype.getValue = function(ws, returnRaw) {
		this._init(ws);
		var activeCell = ws.getSelection().activeCell;
		var res = this._formula.calculate(null, new Asc.Range(activeCell.col, activeCell.row, activeCell.col, activeCell.row));
		return returnRaw ? this._formula.simplifyRefType(res) : res;
	};

	function CDataValidation() {
		this.ranges = null;

		this.allowBlank = false;
		this.showDropDown = false; // Excel considers this field to be a refusal to display
		this.showErrorMessage = false;
		this.showInputMessage = false;
		this.type = EDataValidationType.None;
		this.errorStyle = EDataValidationErrorStyle.Stop;
		this.imeMode = EDataValidationImeMode.NoControl;
		this.operator = EDataValidationOperator.Between;
		this.error = null;
		this.errorTitle = null;
		this.promt = null;
		this.promptTitle = null;

		this.formula1 = null;
		this.formula2 = null;

		return this;
	}

	CDataValidation.prototype._init = function (ws) {
		if (this.formula1) {
			this.formula1._init(ws);
		}
		if (this.formula2) {
			this.formula2._init(ws);
		}
	};
	CDataValidation.prototype.clone = function() {
		var res = new CDataValidation();
		if (this.ranges) {
			res.ranges = [];
			for (var i = 0; i < this.ranges.length; ++i) {
				res.ranges.push(this.ranges[i].clone());
			}
		}
		res.allowBlank = this.allowBlank;
		res.showDropDown = this.showDropDown;
		res.showErrorMessage = this.showErrorMessage;
		res.showInputMessage = this.showInputMessage;
		res.type = this.type;
		res.errorStyle = this.errorStyle;
		res.imeMode = this.imeMode;
		res.operator = this.operator;
		res.error = this.error;
		res.errorTitle = this.errorTitle;
		res.promt = this.promt;
		res.promptTitle = this.promptTitle;
		res.formula1 = this.formula1;
		res.formula2 = this.formula2;
		return res;
	};
	CDataValidation.prototype.setSqRef = function(sqRef) {
		this.ranges = AscCommonExcel.g_oRangeCache.getRangesFromSqRef(sqRef);
	};
	CDataValidation.prototype.contains = function (c, r) {
		if (this.ranges) {
			for (var i = 0; i < this.ranges.length; ++i) {
				if (this.ranges[i].contains(c, r)) {
					return true;
				}
			}
		}
		return false;
	};
	CDataValidation.prototype.checkValue = function (cell, ws) {
		if (!this.showErrorMessage) {
			return true;
		}

		var cellType = cell.getType();
		var val = cell.getValueWithoutFormat();

		if (EDataValidationType.List === this.type) {
			var list = this._getListValues(ws);
			var aValue = list[0];
			if (!aValue) {
				return false;
			}
			var aData = list[1];
			if (aData) {
				for (var i = 0; i < aData.length; ++i) {
					if (aData[i].isEqualCell(cell)) {
						return true;
					}
				}
			} else {
				return -1 !== aValue.indexOf(val);
			}
		} else if (EDataValidationType.Custom === this.type) {
			var v = this.formula1 && this.formula1.getValue(ws, true);
			v = v && v.tocBool();
			return !!(v && AscCommonExcel.cElementType.bool === v.type && v.toBool());
		} else {
			if (EDataValidationType.TextLength === this.type) {
				val = val.length;
			} else {
				if (AscCommon.CellValueType.Number !== cellType) {
					return false;
				}
				val = Number(val);

				if (isNaN(val) || (EDataValidationType.Whole === this.type && (val >> 0) !== val)) {
					return false;
				}
			}

			var v1 = this.formula1 && this.formula1.getValue(ws, true);
			var v2 = this.formula2 && this.formula2.getValue(ws, true);
			if (!checkIntegerType(v1)) {
				return false;
			}
			v1 = v1.toNumber();

			var res = false;
			switch (this.operator) {
				case EDataValidationOperator.Between:
					res = checkIntegerType(v2) && v1 <= val && val <= v2.toNumber();
					break;
				case EDataValidationOperator.NotBetween:
					res = checkIntegerType(v2) && !(v1 <= val && val <= v2.toNumber());
					break;
				case EDataValidationOperator.Equal:
					res = v1 === val;
					break;
				case EDataValidationOperator.NotEqual:
					res = v1 !== val;
					break;
				case EDataValidationOperator.LessThan:
					res = v1 > val;
					break;
				case EDataValidationOperator.LessThanOrEqual:
					res = v1 >= val;
					break;
				case EDataValidationOperator.GreaterThan:
					res = v1 < val;
					break;
				case EDataValidationOperator.GreaterThanOrEqual:
					res = v1 <= val;
					break;
			}
			return res;
		}
		return false;
	};
	CDataValidation.prototype._getListValues = function (ws) {
		var aValue, aData;
		var list = this.formula1 && this.formula1.getValue(ws, false);
		if (list && AscCommonExcel.cElementType.error !== list.type) {
			if (AscCommonExcel.cElementType.string === list.type) {
				aValue = list.getValue().split(AscCommon.FormulaSeparators.functionArgumentSeparatorDef);
			} else {
				list = list.getRange();
				if (list) {
					aValue = [];
					aData = [];
					list._foreachNoEmpty(function (cell) {
						if (!cell.isNullTextString()) {
							aValue.push(cell.getValue());
							aData.push(new AscCommonExcel.CCellValue(cell));
						}
					});
				}
			}
		}
		return [aValue, aData];
	};
	CDataValidation.prototype.isListValues = function () {
		return (this.type === EDataValidationType.List && !this.showDropDown);
	};
	CDataValidation.prototype.getListValues = function (ws) {
		return this.isListValues() ?  this._getListValues(ws) : null;
	};

	CDataValidation.prototype.getError = function () {
		return this.error;
	};
	CDataValidation.prototype.getErrorStyle = function () {
		return this.errorStyle;
	};
	CDataValidation.prototype.getErrorTitle = function () {
		return this.errorTitle;
	};

	function CDataValidations() {
		this.disablePrompts = false;
		this.xWindow = null;
		this.yWindow = null;

		this.elems = [];

		return this;
	}

	CDataValidations.prototype.init = function (ws) {
		for (var i = 0; i < this.elems.length; ++i) {
			this.elems[i]._init(ws);
		}
	};
	CDataValidations.prototype.clone = function() {
		var i, res = new CDataValidations();
		res.disablePrompts = this.disablePrompts;
		res.xWindow = this.xWindow;
		res.yWindow = this.yWindow;
		for (i = 0; i < this.elems.length; ++i) {
			res.elems.push(this.elems[i].clone());
		}
		return res;
	};

	/*
	 * Export
	 * -----------------------------------------------------------------------------
	 */
	var prot;
	window['Asc'] = window['Asc'] || {};
	window['Asc']['c_oAscEDataValidationType'] = window['Asc'].EDataValidationType = EDataValidationType;
	prot = EDataValidationType;
	prot['None'] = prot.None;
	prot['Custom'] = prot.Custom;
	prot['Date'] = prot.Date;
	prot['Decimal'] = prot.Decimal;
	prot['List'] = prot.List;
	prot['TextLength'] = prot.TextLength;
	prot['Time'] = prot.Time;
	prot['Whole'] = prot.Whole;

	window['Asc']['c_oAscEDataValidationErrorStyle'] = window['Asc'].EDataValidationErrorStyle = EDataValidationErrorStyle;
	prot = EDataValidationErrorStyle;
	prot['Stop'] = prot.Stop;
	prot['Warning'] = prot.Warning;
	prot['Information'] = prot.Information;

	window['Asc'].EDataValidationImeMode = EDataValidationImeMode;

	window['AscCommonExcel'] = window['AscCommonExcel'] || {};
	window['AscCommonExcel'].CDataFormula = CDataFormula;
	window['AscCommonExcel'].CDataValidation = CDataValidation;
	prot = CDataValidation.prototype;
	prot['asc_getError'] = prot.getError;
	prot['asc_getErrorStyle'] = prot.getErrorStyle;
	prot['asc_getErrorTitle'] = prot.getErrorTitle;

	window['AscCommonExcel'].CDataValidations = CDataValidations;
})(window);
