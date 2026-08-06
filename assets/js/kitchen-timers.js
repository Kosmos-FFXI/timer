/**
 * Kitchen Timers — core app.
 *
 * - Multiple simultaneous timers (presets can be launched repeatedly).
 * - Custom timers: pick a duration and type a name — when the timer goes
 *   off it plays a loud "ding" and then speaks the name out loud
 *   ("Whitefish is done") using the Web Speech API.
 * - The ding is scheduled against the Web Audio clock (AudioContext.currentTime),
 *   which keeps advancing accurately even when the tab is backgrounded and
 *   setInterval/requestAnimationFrame get throttled by the browser. That is
 *   what makes the first alert fire on time even if this tab isn't focused.
 *   The spoken announcement (Web Speech API) runs on the regular JS timer,
 *   so on a deeply-backgrounded tab it may lag slightly behind the ding —
 *   the ding itself will still be on time.
 * - State is persisted to localStorage so a reload (or a timer that finished
 *   while the tab was closed) is picked back up correctly.
 */

(function () {
  	'use strict';

 	var STORAGE_KEY = 'kosmos_kitchen_timers_v2';
  	var MAX_ALARM_SECONDS = 180; // keep the ding looping for up to 3 minutes unless dismissed
 	var BURST_GAP = 0.6;
  	var ANNOUNCE_INTERVAL_MS = 3200;

 	/* ─────────────────────────────────────────────────────────────────────
  	   Presets
  	   ───────────────────────────────────────────────────────────────────── */

 	var PRESETS = [
    { key: 'whitefish',    name: 'Whitefish',     label: '8 min',       seconds: 8 * 60 },
    { key: 'lobster-tail', name: 'Lobster Tail',  label: '8 min',       seconds: 8 * 60 },
    { key: 'salmon',       name: 'Salmon',        label: '12 min',      seconds: 12 * 60 },
    { key: 'roasted-veg',  name: 'Roasted Veg',   label: '12 min',      seconds: 12 * 60 },
    { key: 'escargot',     name: 'Escargot',      label: '4 min',       seconds: 4 * 60 },
    { key: 'land-and-sea', name: 'Land and Sea',  label: '8 min',       seconds: 8 * 60 },
    { key: 'bakers',       name: 'Bakers',        label: '1 hr',        seconds: 60 * 60 },
    { key: 'prime-rib',    name: 'Prime Rib',     label: '2 hr 5 min',  seconds: 2 * 3600 + 5 * 60 },
    { key: 'brownies',     name: 'Brownies',      label: '50 min',      seconds: 50 * 60 },
    { key: 'creme-b',      name: 'Crème B.',      label: '35 min',      seconds: 35 * 60 },
    { key: 'ribs',         name: 'Ribs',          label: '3 hr',        seconds: 3 * 3600 },
    { key: 'rice',         name: 'Rice',          label: '35 min',      seconds: 35 * 60 },
    { key: 'corned-beef',  name: 'Corned Beef',   label: '2 hr 30 min', seconds: 2 * 3600 + 30 * 60 }
    	];

 	/* ─────────────────────────────────────────────────────────────────────
  	   Ding — synthesized with the Web Audio API (no external audio files),
  	   pushed through a compressor/gain chain to be as loud as possible
  	   without harsh digital clipping.
  	   ───────────────────────────────────────────────────────────────────── */

 	function dingBurst(ctx, dest, when) {
    		var nodes = [];
    		var strikes = [0, 0.32];
    		var strikeDur = 0.5;
    		strikes.forEach(function (offset) {
          			var t = when + offset;
          			var osc = ctx.createOscillator();
          			var gain = ctx.createGain();
          			osc.type = 'sine';
          			osc.frequency.setValueAtTime(1568, t);
          			osc.connect(gain);
          			gain.connect(dest);
          			gain.gain.cancelScheduledValues(t);
          			gain.gain.setValueAtTime(0.95, t);
          			gain.gain.exponentialRampToValueAtTime(0.0001, t + strikeDur);
          			osc.start(t);
          			osc.stop(t + strikeDur + 0.05);
          			nodes.push(osc, gain);
        });
    		return { duration: 0.32 + strikeDur, nodes: nodes };
  }

 	/* ─────────────────────────────────────────────────────────────────────
  	   Audio engine
  	   ───────────────────────────────────────────────────────────────────── */

 	var AudioEngine = {
    		ctx: null,
    		boost: null,
    		scheduled: {}, // timerId -> [nodes]

    		ensureContext: function () {
          			if (!this.ctx) {
                  				var Ctx = window.AudioContext || window.webkitAudioContext;
                  				if (!Ctx) return null;
                  				this.ctx = new Ctx();

          				// Loudness chain: pre-gain boost -> brickwall-style compressor -> master gain.
          				var boost = this.ctx.createGain();
                  				boost.gain.value = 2.4;

          				var compressor = this.ctx.createDynamicsCompressor();
                  				compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
                  				compressor.knee.setValueAtTime(0, this.ctx.currentTime);
                  				compressor.ratio.setValueAtTime(20, this.ctx.currentTime);
                  				compressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
                  				compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

          				var master = this.ctx.createGain();
                  				master.gain.value = 1.0;

          				boost.connect(compressor);
                  				compressor.connect(master);
                  				master.connect(this.ctx.destination);

          				this.boost = boost;
                }
          			if (this.ctx.state === 'suspended') {
                  				this.ctx.resume().catch(function () {});
                }
          			return this.ctx;
        },

    		unlock: function () {
          			var self = this;
          			var handler = function () {
                  				self.ensureContext();
                  				self.startKeepAlive();
                  				document.removeEventListener('click', handler);
                  				document.removeEventListener('touchstart', handler);
                  				document.removeEventListener('keydown', handler);
                };
          			document.addEventListener('click', handler);
          			document.addEventListener('touchstart', handler);
          			document.addEventListener('keydown', handler);
        },

    		/**
          		 * A continuous, effectively-silent tone. On iPadOS/iOS, a page that
    		 * holds an active audio session is less likely to be fully suspended
    		 * the moment it's backgrounded — best-effort, not a guarantee.
    		 */
    		startKeepAlive: function () {
          			var ctx = this.ensureContext();
          			if (!ctx || this._keepAlive) return;
          			var osc = ctx.createOscillator();
          			var gain = ctx.createGain();
          			osc.type = 'sine';
          			osc.frequency.value = 20;
          			gain.gain.value = 0.0007;
          			osc.connect(gain);
          			gain.connect(ctx.destination);
          			osc.start();
          			this._keepAlive = { osc: osc, gain: gain };
        },

    		playDing: function () {
          			var ctx = this.ensureContext();
          			if (!ctx) return;
          			dingBurst(ctx, this.boost, ctx.currentTime + 0.01);
        },

    		/**
          		 * Schedule a looping ding for `timerId` to start `delaySeconds` from now,
    		 * using the Web Audio clock. This is what keeps the first alert on-time
    		 * even when the tab is in the background and JS timers get throttled.
    		 */
    		scheduleAlarm: function (timerId, delaySeconds) {
          			var ctx = this.ensureContext();
          			if (!ctx) return;
          			this.cancelAlarm(timerId);

    			var startAt = ctx.currentTime + Math.max(0, delaySeconds);
          			var t = startAt;
          			var nodes = [];

    			while (t - startAt < MAX_ALARM_SECONDS) {
            				var result = dingBurst(ctx, this.boost, t);
            				nodes = nodes.concat(result.nodes);
            				t += result.duration + BURST_GAP;
          }

    			this.scheduled[timerId] = nodes;
        },

    		cancelAlarm: function (timerId) {
          			var nodes = this.scheduled[timerId];
          			if (!nodes) return;
          			var now = this.ctx ? this.ctx.currentTime : 0;
          			nodes.forEach(function (node) {
                  				try {
                            					if (typeof node.stop === 'function') {
                                        						node.stop(now);
                                      }
                            					node.disconnect();
                          } catch (e) {
                            					/* already stopped */
                          }
                });
          			delete this.scheduled[timerId];
        },

    		/**
          		 * Speak text out loud. Volume is capped at 1.0 by the Web Speech API —
    		 * unlike the ding, browsers don't expose a way to gain-boost synthesized
    		 * speech beyond 100%.
    		 */
    		speak: function (text) {
          			if (!('speechSynthesis' in window)) return;
          			try {
                  				var utter = new SpeechSynthesisUtterance(text);
                  				utter.volume = 1;
                  				utter.rate = 0.95;
                  				utter.pitch = 1;
                  				window.speechSynthesis.speak(utter);
                } catch (e) {
                  				/* speech synthesis unavailable */
                }
        }
  };

 	/* ─────────────────────────────────────────────────────────────────────
  	   Helpers
  	   ───────────────────────────────────────────────────────────────────── */

 	function uid() {
    		if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    		return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

 	function formatTime(totalSeconds) {
    		var s = Math.max(0, Math.round(totalSeconds));
    		var h = Math.floor(s / 3600);
    		var m = Math.floor((s % 3600) / 60);
    		var sec = s % 60;
    		var ss = String(sec).padStart(2, '0');
    		if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + ss;
    		return m + ':' + ss;
  }

 	function saveState(timers) {
    		try {
          			var payload = timers.map(function (t) {
                  				return {
                            					id: t.id,
                            					name: t.name,
                            					sourceLabel: t.sourceLabel,
                            					totalSeconds: t.totalSeconds,
                            					remaining: t.remaining,
                            					endTime: t.endTime,
                            					status: t.status
                          };
                });
          			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
          			/* storage unavailable — app still works, just without persistence */
        }
  }

 	function loadState() {
    		try {
          			var raw = window.localStorage.getItem(STORAGE_KEY);
          			return raw ? JSON.parse(raw) : [];
        } catch (e) {
          			return [];
        }
  }

 	/* ─────────────────────────────────────────────────────────────────────
  	   Alpine component
  	   ───────────────────────────────────────────────────────────────────── */

 	window.kitchenTimerApp = function () {
    		return {
          			presets: PRESETS,
          			timers: [],
          			announceTimers: {},

          			build: {
                  				hours: 0,
                  				minutes: 5,
                  				seconds: 0,
                  				name: ''
                },

          			originalTitle: document.title,
          			notifyPermissionAsked: false,

          			init: function () {
                  				var self = this;
                  				AudioEngine.unlock();

          				var stored = loadState();
                  				var now = Date.now();

          				this.timers = stored.map(function (t) {
                    					var timer = Object.assign({}, t);
                    					if (timer.status === 'running') {
                                						var remainingMs = timer.endTime - now;
                                						if (remainingMs <= 0) {
                                              							timer.status = 'ringing';
                                              							timer.remaining = 0;
                                              							AudioEngine.scheduleAlarm(timer.id, 0);
                                              							self.$nextTick(function () { self.startAnnounceLoop(timer); });
                                            } else {
                                              							timer.remaining = Math.round(remainingMs / 1000);
                                              							AudioEngine.scheduleAlarm(timer.id, remainingMs / 1000);
                                            }
                              } else if (timer.status === 'ringing') {
                                						AudioEngine.scheduleAlarm(timer.id, 0);
                                						self.$nextTick(function () { self.startAnnounceLoop(timer); });
                              }
                    					return timer;
                  });

          				setInterval(function () {
                    					self.tick();
                  }, 250);

          				document.addEventListener('visibilitychange', function () {
                    					if (document.visibilityState === 'visible') {
                                						self.tick();
                              }
                  });

          				window.addEventListener('beforeunload', function () {
                    					saveState(self.timers);
                  });

          				setInterval(function () {
                    					self.updateTitle();
                  }, 1000);
                },

          			tick: function () {
                  				var self = this;
                  				var now = Date.now();
                  				var changed = false;
                  				this.timers.forEach(function (timer) {
                            					if (timer.status !== 'running') return;
                            					var remainingMs = timer.endTime - now;
                            					var remaining = Math.max(0, Math.round(remainingMs / 1000));
                            					if (remaining !== timer.remaining) {
                                        						timer.remaining = remaining;
                                        						changed = true;
                                      }
                            					if (remainingMs <= 0 && timer.status === 'running') {
                                        						timer.status = 'ringing';
                                        						timer.remaining = 0;
                                        						changed = true;
                                        						self.notify(timer);
                                        						self.startAnnounceLoop(timer);
                                      }
                          });
                  				if (changed) saveState(this.timers);
                },

          			updateTitle: function () {
                  				var ringing = this.timers.filter(function (t) { return t.status === 'ringing'; }).length;
                  				if (ringing > 0) {
                            					var flash = Math.floor(Date.now() / 1000) % 2 === 0;
                            					document.title = flash ? ('⏰ TIME’S UP! (' + ringing + ')') : this.originalTitle;
                          } else {
                            					document.title = this.originalTitle;
                          }
                },

          			notify: function (timer) {
                  				if (!('Notification' in window)) return;
                  				if (Notification.permission === 'granted' && document.hidden) {
                            					try {
                                        						new Notification(timer.name + ' is done', {
                                                      							body: 'Your kitchen timer has finished.',
                                                      							tag: timer.id
                                                    });
                                      } catch (e) {}
                          }
                },

          			requestNotifyPermission: function () {
                  				if (this.notifyPermissionAsked) return;
                  				this.notifyPermissionAsked = true;
                  				if ('Notification' in window && Notification.permission === 'default') {
                            					Notification.requestPermission().catch(function () {});
                          }
                },

          			/**
                  			 * Ding immediately, then speak "<name> is done" shortly after so the
          			 * two don't overlap. Repeats every few seconds while the timer is
          			 * still in the "ringing" state, until dismissed.
          			 */
          			announceOnce: function (timer) {
                  				AudioEngine.playDing();
                  				window.setTimeout(function () {
                            					AudioEngine.speak(timer.name + ' is done');
                          }, 550);
                },

          			startAnnounceLoop: function (timer) {
                  				var self = this;
                  				if (this.announceTimers[timer.id]) return;
                  				this.announceOnce(timer);
                  				this.announceTimers[timer.id] = window.setInterval(function () {
                            					var current = self.timers.find(function (t) { return t.id === timer.id; });
                            					if (!current || current.status !== 'ringing') {
                                        						self.stopAnnounceLoop(timer.id);
                                        						return;
                                      }
                            					self.announceOnce(current);
                          }, ANNOUNCE_INTERVAL_MS);
                },

          			stopAnnounceLoop: function (timerId) {
                  				if (this.announceTimers[timerId]) {
                            					window.clearInterval(this.announceTimers[timerId]);
                            					delete this.announceTimers[timerId];
                          }
                },

          			formatTime: formatTime,

          			buildTotalSeconds: function () {
                  				var h = parseInt(this.build.hours, 10) || 0;
                  				var m = parseInt(this.build.minutes, 10) || 0;
                  				var s = parseInt(this.build.seconds, 10) || 0;
                  				return h * 3600 + m * 60 + s;
                },

          			previewAnnouncement: function () {
                  				var name = (this.build.name || '').trim() || 'Timer';
                  				AudioEngine.playDing();
                  				window.setTimeout(function () {
                            					AudioEngine.speak(name + ' is done');
                          }, 550);
                },

          			startPreset: function (preset) {
                  				this.requestNotifyPermission();
                  				var id = uid();
                  				var now = Date.now();
                  				var timer = {
                            					id: id,
                            					name: preset.name,
                            					sourceLabel: preset.label,
                            					totalSeconds: preset.seconds,
                            					remaining: preset.seconds,
                            					endTime: now + preset.seconds * 1000,
                            					status: 'running'
                          };
                  				this.timers.unshift(timer);
                  				AudioEngine.scheduleAlarm(id, preset.seconds);
                  				saveState(this.timers);
                },

          			startCustom: function () {
                  				this.requestNotifyPermission();
                  				var totalSeconds = this.buildTotalSeconds();
                  				if (totalSeconds <= 0) return;
                  				var name = (this.build.name || '').trim() || 'Timer';
                  				var id = uid();
                  				var now = Date.now();
                  				var timer = {
                            					id: id,
                            					name: name,
                            					sourceLabel: 'Custom',
                            					totalSeconds: totalSeconds,
                            					remaining: totalSeconds,
                            					endTime: now + totalSeconds * 1000,
                            					status: 'running'
                          };
                  				this.timers.unshift(timer);
                  				AudioEngine.scheduleAlarm(id, totalSeconds);
                  				saveState(this.timers);

          				this.build.hours = 0;
                  				this.build.minutes = 5;
                  				this.build.seconds = 0;
                  				this.build.name = '';
                },

          			pauseTimer: function (timer) {
                  				if (timer.status !== 'running') return;
                  				timer.remaining = Math.max(0, Math.round((timer.endTime - Date.now()) / 1000));
                  				timer.endTime = null;
                  				timer.status = 'paused';
                  				AudioEngine.cancelAlarm(timer.id);
                  				saveState(this.timers);
                },

          			resumeTimer: function (timer) {
                  				if (timer.status !== 'paused') return;
                  				timer.endTime = Date.now() + timer.remaining * 1000;
                  				timer.status = 'running';
                  				AudioEngine.scheduleAlarm(timer.id, timer.remaining);
                  				saveState(this.timers);
                },

          			restartTimer: function (timer) {
                  				this.stopAnnounceLoop(timer.id);
                  				timer.remaining = timer.totalSeconds;
                  				timer.endTime = Date.now() + timer.totalSeconds * 1000;
                  				timer.status = 'running';
                  				AudioEngine.scheduleAlarm(timer.id, timer.totalSeconds);
                  				saveState(this.timers);
                },

          			dismissTimer: function (timer) {
                  				this.stopAnnounceLoop(timer.id);
                  				AudioEngine.cancelAlarm(timer.id);
                  				this.timers = this.timers.filter(function (t) { return t.id !== timer.id; });
                  				saveState(this.timers);
                },

          			removeTimer: function (timer) {
                  				this.stopAnnounceLoop(timer.id);
                  				AudioEngine.cancelAlarm(timer.id);
                  				this.timers = this.timers.filter(function (t) { return t.id !== timer.id; });
                  				saveState(this.timers);
                },

          			progressPercent: function (timer) {
                  				if (!timer.totalSeconds) return 0;
                  				var pct = 100 - (timer.remaining / timer.totalSeconds) * 100;
                  				return Math.min(100, Math.max(0, pct));
                }
        };
  };
})();
