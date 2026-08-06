<?php
/**
 * Kitchen Timers front page — the whole app lives here.
 */
get_header();
?>

<main class="flex-1" x-data="kitchenTimerApp()">

	<section class="max-w-5xl mx-auto px-6 pt-12 pb-8">
		<div class="eyebrow mb-3">Multi-Timer for the Kitchen</div>
		<h1 class="font-display text-3xl md:text-4xl font-extrabold text-primary-50 max-w-2xl leading-tight">
			Run every timer in the kitchen at once — and actually hear it go off.
		</h1>
		<p class="mt-4 text-primary-200 max-w-2xl leading-relaxed">
			Tap a preset to start it — tap it again to start another one alongside it. Or build your own timer below and name it. When it's done, it dings loudly and says the name out loud — "Whitefish is done" — so you know exactly which timer went off without walking over to look.
		</p>
	</section>

	<!-- Active timers -->
	<section class="max-w-5xl mx-auto px-6 pb-4" x-show="timers.length > 0" x-cloak>
		<div class="flex items-center justify-between mb-4">
			<h2 class="font-display text-lg font-bold text-primary-50">Running</h2>
			<span class="text-xs text-primary-300 font-mono" x-text="timers.length + ' active'"></span>
		</div>
		<div class="grid sm:grid-cols-2 gap-4 mb-10">
			<template x-for="timer in timers" :key="timer.id">
				<div class="timer-card"
					 :class="{ 'is-ringing': timer.status === 'ringing', 'is-paused': timer.status === 'paused' }">

					<div class="flex items-start justify-between gap-3 mb-3">
						<div class="min-w-0">
							<div class="font-display font-bold text-primary-50 truncate" x-text="timer.name"></div>
							<div class="text-xs text-primary-300 font-mono mt-0.5" x-text="timer.sourceLabel"></div>
						</div>
						<span class="timer-ring-badge"
							  :class="{
								  'state-running': timer.status === 'running',
								  'state-paused': timer.status === 'paused',
								  'state-ringing': timer.status === 'ringing'
							  }">
							<span class="w-1.5 h-1.5 rounded-full bg-current" :class="timer.status === 'running' ? 'pulse-dot' : ''"></span>
							<span x-text="timer.status === 'running' ? 'Running' : (timer.status === 'paused' ? 'Paused' : 'Ringing')"></span>
						</span>
					</div>

					<div class="timer-digits mb-4" x-text="formatTime(timer.remaining)"></div>

					<div class="h-1.5 rounded-full bg-primary-800 overflow-hidden mb-4" x-show="timer.status !== 'ringing'">
						<div class="h-full bg-secondary transition-all duration-300 ease-linear" :style="'width:' + progressPercent(timer) + '%'"></div>
					</div>

					<template x-if="timer.status === 'ringing'">
						<button type="button" @click="dismissTimer(timer)" class="btn-solid w-full !py-2.5 mb-2">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
							Dismiss Alarm
						</button>
					</template>

					<div class="flex items-center gap-2" x-show="timer.status !== 'ringing'">
						<button type="button" class="icon-btn" x-show="timer.status === 'running'" @click="pauseTimer(timer)" aria-label="Pause">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
						</button>
						<button type="button" class="icon-btn" x-show="timer.status === 'paused'" @click="resumeTimer(timer)" aria-label="Resume">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7V5z"/></svg>
						</button>
						<button type="button" class="icon-btn" @click="restartTimer(timer)" aria-label="Restart">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true"><path d="M20 11A8 8 0 1 0 18.5 6"/><path d="M20 4v4h-4"/></svg>
						</button>
						<button type="button" class="icon-btn danger ml-auto" @click="removeTimer(timer)" aria-label="Remove">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
						</button>
					</div>
				</div>
			</template>
		</div>
	</section>

	<!-- Presets -->
	<section class="max-w-5xl mx-auto px-6 pb-14">
		<div class="flex items-baseline justify-between mb-4">
			<h2 class="font-display text-lg font-bold text-primary-50">Presets</h2>
			<span class="text-xs text-primary-300">Tap to start — tap again to run another one at the same time</span>
		</div>
		<div class="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
			<template x-for="preset in presets" :key="preset.key">
				<button type="button" class="preset-tile" @click="startPreset(preset)">
					<span class="preset-plus">
						<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
					</span>
					<span class="preset-name" x-text="preset.name"></span>
					<span class="preset-duration" x-text="preset.label"></span>
				</button>
			</template>
		</div>
	</section>

	<!-- Custom timer builder -->
	<section class="max-w-5xl mx-auto px-6 pb-20">
		<h2 class="font-display text-lg font-bold text-primary-50 mb-4">Build a Custom Timer</h2>
		<div class="builder-card">
			<div class="grid md:grid-cols-5 gap-6">
				<div class="md:col-span-2">
					<div class="eyebrow mb-3">Duration</div>
					<div class="grid grid-cols-3 gap-3">
						<label class="block">
							<input type="number" min="0" max="23" class="dial-input" x-model.number="build.hours">
							<span class="block text-center text-[11px] text-primary-300 mt-1 uppercase tracking-wide">Hours</span>
						</label>
						<label class="block">
							<input type="number" min="0" max="59" class="dial-input" x-model.number="build.minutes">
							<span class="block text-center text-[11px] text-primary-300 mt-1 uppercase tracking-wide">Minutes</span>
						</label>
						<label class="block">
							<input type="number" min="0" max="59" class="dial-input" x-model.number="build.seconds">
							<span class="block text-center text-[11px] text-primary-300 mt-1 uppercase tracking-wide">Seconds</span>
						</label>
					</div>
				</div>

				<div class="md:col-span-3">
					<div class="eyebrow mb-3">Name — spoken out loud when it's done</div>
					<div class="flex items-center gap-2.5">
						<input type="text" maxlength="40" placeholder="e.g. Cookies" class="dial-input !text-left !text-lg !font-sans !font-semibold flex-1" x-model="build.name">
						<button type="button" class="icon-btn !w-11 !h-11 flex-shrink-0" @click="previewAnnouncement()" aria-label="Preview announcement">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7V5z"/></svg>
						</button>
					</div>
					<p class="text-xs text-primary-300 mt-3 max-w-sm">
						When this timer ends it will ding and say
						<strong class="text-secondary-200">"<span x-text="(build.name || 'Timer')"></span> is done."</strong>
						Tap the play button to preview it.
					</p>
				</div>
			</div>

			<div class="mt-7 flex items-center justify-end gap-4 flex-wrap">
				<button type="button" class="btn-solid" @click="startCustom()" :disabled="buildTotalSeconds() <= 0">
					Start Timer
				</button>
			</div>
		</div>
	</section>

</main>

<?php get_footer(); ?>
