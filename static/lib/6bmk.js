'use strict';

/*
	This file is located in the "modules" block of plugin.json
	It is only loaded when the user navigates to /6bmk page
	It is not bundled into the min file that is served on the first load of the page.
*/

define('/6bmk', function () {
	var module = {};
	module.init = function () {
		const [
			message,
			error,
			typewriter,
			svgContainer,
			input,
			paper,
			hammer,
			roller,
		] = [
			'message',
			'error',
			'typewriter',
			'svg-container',
			'input',
			'paper', 
			'hammer', 
			'roller'
		].map(id => document.getElementById(id));
	
		// find keys  
		const keys = {};
		const svg = typewriter.getElementsByTagName('svg')[0];
		const groups = svg.getElementsByTagName('g');
		for (const group of groups) {
			const { id } = group;
			if (id && id.startsWith('key-')) {
				const name = id.substring(4).replace(/\-/g, '');
				const key = { group, name, down: false };
				keys[name] = key;
				group.classList.add('key');
			}
		}
		
		function reposition(animate) {
			if (typewriter.classList.contains('animating')) {
				return;
			}
			// find cursor screen position
			const range = getRange(input);
			const rangeRect = getRangeRect(range);
			// line up hammer position with cursor
			const hammerRect = hammer.getBoundingClientRect();
			const paperRect = paper.getBoundingClientRect();
			const rangeXOffset = hammerRect.left - rangeRect.left;
			const rangeYOffset = hammerRect.top - rangeRect.bottom;
			// reposition paper, animate only when jumping between lines
			const inputRect = input.getBoundingClientRect();
			const paperYOffset = inputRect.top + rangeYOffset - paperRect.top;
			const isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
			const animating = animate && isChrome ? paperYOffset !== 0 : false;
			typewriter.classList.toggle('animating', animating);
			shiftSVGElement(paper, 0, paperYOffset);
			// reposition roller
			const rollerRect = roller.getBoundingClientRect();
			const paperXOffset = paperRect.left - rollerRect.left;
			const rollerXOffset = inputRect.left + rangeXOffset - paperXOffset - rollerRect.left;
			shiftSVGElement(roller, rollerXOffset, 0);
			// align text input with paper
			const alignInput = () => {
				const paperRect = paper.getBoundingClientRect();
				const rootRect = typewriter.getBoundingClientRect();
				input.style.left = `${paperRect.left - rootRect.left}px`;
				input.style.top = `${paperRect.top - rootRect.top}px`;
				input.style.width = `${paperRect.width}px`;
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
					typewriter.classList.remove('animating');
				};
				const svg = paper.ownerSVGElement;
				update();
				svg.addEventListener('transitionend', stop, { once: true });
			} else {
				alignInput();
			}
			return range;
		}
	
		function getRange(element) {
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
	
		function shiftSVGElement(element, clientX, clientY) {
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

		let cursor;
	
		function handleBeforeInput(evt) {
			if (evt.inputType?.startsWith('format')) {
				evt.preventDefault();
			}
		}
	
		function handleInput(evt) {
			reposition();
			const paperRect = paper.getBoundingClientRect();
			if (evt.target.offsetHeight > paperRect.height) {
				console.log('broken');
			}
		}
	
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
			let name = evt.code.toLowerCase();
			if (name.startsWith('key')) {
				name = name.substr(3);
			}
			return keys[name];
		}

		function getKeyByGroup(evt) {
			let { target } = evt;
			while (target.tagName !== 'svg') {
				if (target.tagName === 'g') {
					if (target.id.startsWith('key-')) {
						for (const key of Object.values(keys)) {
							if (key.group === target) {
								return key;
							}
						}
					}
					break;
				}
				target = target.parentNode;
			}
		}
	
		function getTravel() {
			const { offsetWidth } = typewriter;
			return offsetWidth / 40;
		}

		function isFunctional(key) {
			const { cursor } = getComputedStyle(key.group);
			return (cursor === 'pointer');
		}
	
		function handleKeyDown(evt) {
			const key = getKey(evt);
			if (key && !key.down) {
				key.down = true;
				shiftSVGElement(key.group, 0, getTravel());
			}
		}
		
		function handleKeyUp(evt) {
			const key = getKey(evt);
			if (key && key.down) {
				key.down = false;
				shiftSVGElement(key.group, 0, -getTravel());
			}
		}

		let pressedKey = null;

		function handleTypewriterMouseDown(evt) {
			const key = getKeyByGroup(evt);
			if (key && !key.down && isFunctional(key)) {
				key.down = true;
				shiftSVGElement(key.group, 0, getTravel());
			} 
			pressedKey = key;
			document.addEventListener('mouseup', handleTypewriterMouseUp, { once: true });
		}

		function handleTypewriterMouseUp(evt) {
			input.focus();
			if (cursor) {
				useRange(cursor);
			}
			const key = pressedKey;
			if (key && key.down) {
				key.down = false;
				shiftSVGElement(key.group, 0, -getTravel());
				
				let cmd = 'insertText', arg, m;
				switch (key.name) {
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
					case 'shiftleft':
					case 'shiftright':
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
						arg = key.name.slice(-1);
						break;
				}
				if (cmd) {						
					document.execCommand(cmd, false, arg);
				}
			}
			pressedKey = null;
		}
		
		const observer = new ResizeObserver(() => reposition(false));
		observer.observe(typewriter);
	
		input.addEventListener('beforeinput', handleBeforeInput);
		input.addEventListener('input', handleInput);
		input.addEventListener('paste', handlePaste);
		input.addEventListener('drop', handleDrop);
		input.addEventListener('keydown', handleKeyDown);
		svgContainer.addEventListener('mousedown', handleTypewriterMouseDown);
		document.addEventListener('keyup', handleKeyUp);
		document.addEventListener('selectionchange', handleSelectionChange);
		reposition(true);
	};
	return module;
});
