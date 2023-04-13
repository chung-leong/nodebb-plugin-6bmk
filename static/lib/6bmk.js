'use strict';

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
			stretchSVGElement('#paper', inputPos.height);
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

		function stretchSVGElement(selector, clientHeight) {
			const element = $(selector)[0];
			const [ transform ] = element.transform.baseVal;		
			const before = element.getBoundingClientRect();
			if (before.height !== clientHeight) {
				const yScaleBefore = transform.matrix.d;
				const yScale = Math.max(1, clientHeight / before.height * yScaleBefore);
				transform.matrix.d = yScale;
				const after = element.getBoundingClientRect();
				shiftSVGElement(element, 0, before.y - after.y);
			}
		}

		function showMessage(id) {
			$('#message-container .message').each(function() {
				$(this).toggleClass('active', this.id === id);
			});
		}

		function handleBeforeInput(evt) {
			if (evt.inputType && evt.inputType.startsWith('format')) {
				evt.preventDefault();
			}
		}

		let emulateKeyPress = false, emulatedKey;
		let text = '';

		function handleInput() {
			const newText = $('#input').prop('innerText').trim();
			if (emulateKeyPress) {
				let name;
				if (newText.length < text.length) {
					name = 'backspace';
				} else {
					const { startContainer, startOffset } = getRange('#input');
					if (startOffset > 0) {
						const c = startContainer.nodeValue.substring(startOffset - 1, startOffset);
						name = ({ 
							';': 'semicolon', 
							'.': 'period', 
							',': 'comma', 
							'/': 'slash',
							' ': 'space',
						})[c];
						if (!name && /\w/.test(c)) {
							name = /[0-9]/.test(c) ? 'digit-' + c : c.toLowerCase();
						}
					} else {
						name = 'enter';
					}
				}
				emulatedKey = name ? $(`#key-${name}`)[0] : undefined;
				setTimeout(() => {
					if (emulatedKey && !emulatedKey.down) {
						emulatedKey.down = true;
						shiftSVGElement(emulatedKey, 0, getTravel());
						setTimeout(() => {
							emulatedKey.down = false;
							shiftSVGElement(emulatedKey, 0, -getTravel());
						}, 250);
					}
				}, 10);
			}
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
		}

		let cursor;
		
		function handleSelectionChange() {
			if (document.activeElement === $('#input')[0]) {
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
			emulateKeyPress = false
		}
		
		function handleDrop(evt) {
			copyPlainText(evt.dataTransfer);
			evt.preventDefault();
			evt.stopPropagation();
			emulateKeyPress = false
		}
	
		function getKey(evt) {			
			if (!evt.code) {
				// for Android				
				emulateKeyPress = true;
				return;
			}
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
			if (key && !key.down && !evt.metaKey) {
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

		function handleTypewriterMouseUp() {
			if (document.activeElement !== $('#input')[0]) {
				$('#input').focus();
				if (cursor) {
					useRange(cursor);
				}
			}
		}

		function handleMouseUp(evt) {
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
			if ($('.message').hasClass('busy')) {
				return;
			}
			const id = $('#message-container .message.active').prop('id');
			if (id === 'login-message') {
				ajaxify.go('/login');
			} else if (id === 'sign-up-message') {
				$('.message').addClass('busy');
				$('#error').text('');
				api.post('/plugins/6bmk/validate', { text }, (err, result) => {
					$('.message').removeClass('busy');
					if (err) {
						let { message } = err;
						if (message === 'error') {
							message = 'Unable to connect with server';
						}
						$('#error').text(message);
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
			.on('mouseup', handleTypewriterMouseUp)
			.find('g').each(function() {
				if (this.id && this.id.startsWith('key-')) {
					$(this).addClass('key');
				}
			});
		$('#screen')
			.on('keyup', handleKeyUp)
			.on('mouseup', handleMouseUp)
		$('#message-container')
			.on('click', handleMessageClick);
		$(document)
			.on('selectionchange', handleSelectionChange);
		$(window)
			.one('action:ajaxify.cleanup', () => {
				$(document).off('selectionchange', handleSelectionChange);
				observer.disconnect();
			})
		reposition(true);
		setTimeout(() => $('#message-container').addClass('visible'), 1000);
	};
	return module;
});
