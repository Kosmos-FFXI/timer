<?php
/**
 * Kitchen Timers header.
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<?php get_template_part( 'template-parts/head' ); ?>
</head>

<body <?php body_class( 'bg-background text-primary-50 font-sans min-h-screen flex flex-col' ); ?>>
<?php wp_body_open(); ?>

<header class="border-b border-primary-700">
	<div class="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
		<a class="flex items-center gap-3 no-underline group" href="<?php echo esc_url( home_url( '/' ) ); ?>">
			<span class="w-10 h-10 rounded-full bg-secondary/15 border border-secondary/40 flex items-center justify-center flex-shrink-0">
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" class="text-secondary" aria-hidden="true">
					<circle cx="12" cy="13" r="8"/>
					<path d="M12 9v4l2.5 2.5"/>
					<path d="M9 2h6"/>
					<path d="M18.5 4.5l1.5 1.5"/>
				</svg>
			</span>
			<span class="font-display font-extrabold text-lg text-primary-50 tracking-tight">
				<?php bloginfo( 'name' ); ?>
			</span>
		</a>
		<span class="hidden sm:inline eyebrow">Set it. Forget it. Get notified.</span>
	</div>
</header>
