'use strict';

/*
	This file is located in the "modules" block of plugin.json
	It is only loaded when the user navigates to /6bmk page
	It is not bundled into the min file that is served on the first load of the page.
*/

define('/6bmk', [ 'api' ], function (api) {
	var module = {};
	module.init = function () {	
		function reposition(animate) {
			if ($('#typewriter').hasClass('animating')) {
				return;
			}
			// find cursor screen position
			const range = getRange('#input');
			const rangeRect = getRangeRect(range);
			// line up hammer position with cursor
			const hammerPos = getRect('#hammer');
			const paperPos = getRect('#paper');
			const rangeXOffset = hammerPos.left - rangeRect.left;
			const rangeYOffset = hammerPos.top - rangeRect.bottom;
			// reposition paper, animate only when jumping between lines
			const inputPos = getRect('#input');
			const paperYOffset = inputPos.top + rangeYOffset - paperPos.top;
			const isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
			const animating = animate && isChrome ? paperYOffset !== 0 : false;
			$('#typewriter').toggleClass('animating', animating);
			shiftSVGElement('#paper', 0, paperYOffset);
			// reposition roller
			const rollerPos = getRect('#roller');
			const paperXOffset = paperPos.left - rollerPos.left;
			const rollerXOffset = inputPos.left + rangeXOffset - paperXOffset - rollerPos.left;
			shiftSVGElement('#roller', rollerXOffset, 0);
			// align text input with paper
			const alignInput = () => {
				const paperPos = getRect('#paper');
				const rootPos = getRect('#typewriter');
				const { style } = $('#input')[0];
				style.left = `${paperPos.left - rootPos.left}px`;
				style.top = `${paperPos.top - rootPos.top}px`;
				style.width = `${paperPos.width}px`;
			};
			if (animating) {
				// update position as transition progresses
				let reqId;
				const update = () => {
					alignInput();
					reqId = requestAnimationFrame(update);
				};
				const stop = () => {
					alignInput();
					cancelAnimationFrame(reqId);
					$('#typewriter').removeClass('animating');
				};
				update();
				$('#svg-container').one('transitionend', stop);
			} else {
				alignInput();
			}
			return range;
		}
	
		function getRange(selector) {
			const element = $(selector)[0];
			const selection = getSelection();
			try {
				const range = selection.getRangeAt(0);
				for (let n = range.commonAncestorContainer; n; n = n.parentNode) {
					if (n === element) {
						break;
					} else if (n === document) {
						throw new Error('Element does not have focus');
					}
				}
				return range;
			} catch(e) {
				const range = document.createRange();
				range.selectNodeContents(element);
				range.collapse();
				useRange(range);
				return range;
			}
		}

		function useRange(range) {
			const selection = getSelection();
			selection.removeAllRanges();
			selection.addRange(range);
		}
	
		function getRangeRect(range) {
			if (range.collapsed) {
				// TODO: problematic when there's a newline at the end
				const clone = range.cloneRange();
				const zwj = document.createTextNode('\u200d');
				clone.insertNode(zwj);
				clone.selectNode(zwj);
				const rect = clone.getBoundingClientRect();
				zwj.remove();
				return rect;
			} else {
				return range.getBoundingClientRect();
			}
		} 

		function getRect(selector) {
			const element = $(selector)[0];
			return element.getBoundingClientRect();
		}
	
		function shiftSVGElement(selector, clientX, clientY) {
			const element = $(selector)[0];
			const svg = element.ownerSVGElement;
			const ctm = element.getScreenCTM();
			const ctmi = ctm.inverse();
			const clientOrigin = svg.createSVGPoint().matrixTransform(ctm);
			const clientPt = svg.createSVGPoint();
			clientPt.x = clientX + clientOrigin.x;
			clientPt.y = clientY + clientOrigin.y;
			const svgPt = clientPt.matrixTransform(ctmi);
			const [ transform ] = element.transform.baseVal;
			if (transform) {
				transform.matrix.e += svgPt.x;
				transform.matrix.f += svgPt.y;
			} else {
				element.setAttribute('transform', `translate(${svgPt.x} ${svgPt.y})`);
			}
		}

		function showMessage(id) {
			$('#message-container .message').each(function() {
				$(this).toggleClass('active', this.id === id);
			});
		}

		function handleBeforeInput(evt) {
			if (evt.inputType?.startsWith('format')) {
				evt.preventDefault();
			}
		}

		let text;

		function handleInput(evt) {
			reposition();
			text = $('#input').prop('innerText').trim();
			if (text.length === 0) {
				showMessage('login-message');
			} else {
				const lines = text.split('\n');
				if (lines.length <= 3) {
					showMessage('sign-up-message');
				} else {
					showMessage('extra-lines-message');
				}
			}
			const { bottom } = getRect('#paper');
			const { top } = getRect('#stub');
			if (bottom < top) {
				showMessage('broken-message');
			}
		}

		let cursor;
		
		function handleSelectionChange(evt) {
			if (document.activeElement === input) {
				cursor = reposition();
			}
		}
	
		function copyPlainText(dataTransfer) {
			const text = dataTransfer.getData('text/plain');
			document.execCommand('insertText', false, text);
		}
	
		function handlePaste(evt) {
			copyPlainText(evt.clipboardData);
			evt.preventDefault();
			evt.stopPropagation();
		}
		
		function handleDrop(evt) {
			copyPlainText(evt.dataTransfer);
			evt.preventDefault();
			evt.stopPropagation();
		}
	
		function getKey(evt) {
			let id = evt.code.replace(/[A-Z0-9]/g, m => '-' + m.toLowerCase());
			if (id.startsWith('-key')) {
				id = id.substring(1);
			} else {
				id = 'key' + id;
			}
			return $(`#${id}`)[0];
		}

		function getKeyByGroup(evt) {
			let { target } = evt;
			while (target.tagName !== 'svg') {
				if (target.tagName === 'g') {
					if (target.id.startsWith('key-')) {
						return target;
					}
				}
				target = target.parentNode;
			}
		}
	
		function getTravel() {
			const { offsetWidth } = typewriter;
			return offsetWidth / 40;
		}

		function isFunctional(key) {
			const { cursor } = getComputedStyle(key);
			return (cursor === 'pointer');
		}
	
		function handleKeyDown(evt) {
			const key = getKey(evt);
			if (key && !key.down) {
				key.down = true;
				shiftSVGElement(key, 0, getTravel());
			}
		}
		
		function handleKeyUp(evt) {
			const key = getKey(evt);
			if (key && key.down) {
				key.down = false;
				shiftSVGElement(key, 0, -getTravel());
			}
		}

		let pressedKey = null;

		function handleTypewriterMouseDown(evt) {
			const key = getKeyByGroup(evt);
			if (key && !key.down && isFunctional(key)) {
				key.down = true;
				shiftSVGElement(key, 0, getTravel());
			} 
			pressedKey = key;
		}

		function handleMouseUp(evt) {
			$('#input').focus();
			if (cursor) {
				useRange(cursor);
			}
			const key = pressedKey;
			if (key && key.down) {
				key.down = false;
				shiftSVGElement(key, 0, -getTravel());

				let cmd = 'insertText', arg, m;
				const name = key.id.substring(4);
				switch (name) {
					case 'backspace':
						if (cursor && (!cursor.collapsed || cursor.startOffset >= 0)) {
							cmd = 'delete';
							if (cursor.collapsed) {
								cursor.setStart(cursor.startContainer, cursor.startOffset - 1);
							}
						} else {
							cmd = '';
						}
						break;
					case 'shift-left':
					case 'shift-right':
						cmd = '';
						break;
					case 'space':
						arg = ' ';
						break;
					case 'period':
						arg = '.';
						break;
					case 'comma':
						arg = ',';
						break;
					case 'semicolon':
						arg = ';';
						break;
					case 'slash':
						arg = '/';
						break;
					case 'enter':
						arg = '\n';
						break;
					default:
						arg = name.slice(-1);
						break;
				}
				if (cmd) {						
					document.execCommand(cmd, false, arg);
				}
			}
			pressedKey = null;
		}

		function handleMessageClick(evt) {
			const id = $('#message-container .message.active').prop('id');
			if (id === 'login-message') {
				ajaxify.go('/login');
			} else if (id === 'sign-up-message') {
				api.post('/plugins/6bmk/validate', { text }, (err, result) => {
					if (err) {
						$('#error').text(err.message);
					} else {
						const { found, used } = result;
						if (found) {
							ajaxify.go('/register');
						} else {
							showMessage(used ? 'used-message' : 'incorrect-message');
						}
					}
				});
			}
		}
		
		const observer = new ResizeObserver(() => reposition(false));
		observer.observe($('#typewriter')[0]);

		$('#input')
			.on('beforeinput', handleBeforeInput)
			.on('input', handleInput)
			.on('paste', handlePaste)
			.on('drop', handleDrop)
			.on('keydown', handleKeyDown);
		$('#svg-container')
			.on('mousedown', handleTypewriterMouseDown)
			.find('g').each(function() {
				if (this.id?.startsWith('key-')) {
					$(this).addClass('key');
				}
			});
		$(document)
			.on('keyup', handleKeyUp)
			.on('mouseup', handleMouseUp)
			.on('selectionchange', handleSelectionChange);
		$('#message-container')
			.on('click', handleMessageClick);
		reposition(true);
		setTimeout(() => $('#message-container').addClass('visible'), 1000);
	};
	return module;
});
