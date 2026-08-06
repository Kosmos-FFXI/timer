<?php
/**
 * Kitchen Timers <head> partial.
  *
  * Loaded by header.php via get_template_part( 'template-parts/head' ).
  *
  * The <style type="text/tailwindcss"> block is the Tailwind v4 token
   * source the browser CDN reads in draft preview. Do not remove it.
   * Mode switching is automatic:
   *   - Draft mode (active theme matches the draft option): the WPVibe
   *     plugin enqueues the CDN runtime + plugin-served presets.css.
   *   - Live mode: functions.php enqueues dist/styles.css when present.
   */
?>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

<!-- Add to Home Screen (iPad / iPhone / Android) -->
<link rel="manifest" href="<?php echo esc_url( get_theme_file_uri( 'assets/manifest.json' ) ); ?>">
<meta name="theme-color" content="#1c1712">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Timers">
<link rel="apple-touch-icon" href="<?php echo esc_url( home_url( '/?kt_icon=180' ) ); ?>">
<link rel="apple-touch-icon" sizes="152x152" href="<?php echo esc_url( home_url( '/?kt_icon=152' ) ); ?>">
<link rel="apple-touch-icon" sizes="167x167" href="<?php echo esc_url( home_url( '/?kt_icon=167' ) ); ?>">
<link rel="apple-touch-icon" sizes="180x180" href="<?php echo esc_url( home_url( '/?kt_icon=180' ) ); ?>">
<link rel="icon" type="image/png" sizes="32x32" href="<?php echo esc_url( home_url( '/?kt_icon=32' ) ); ?>">
<link rel="icon" type="image/png" sizes="192x192" href="<?php echo esc_url( home_url( '/?kt_icon=192' ) ); ?>">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gabarito:wght@500;700;800;900&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<?php if ( get_option( 'wpvibe_draft_theme' ) === get_stylesheet() ) : ?>
  <style type="text/tailwindcss"><?php
  	$theme_css_path = get_stylesheet_directory() . '/theme.css';
  	if ( file_exists( $theme_css_path ) ) {
      		readfile( $theme_css_path );
    }
      ?></style>
<?php endif; ?>

<?php wp_head(); ?>
</head>
