<?php
/**
 * Kitchen Timers footer.
 */
?>
<footer class="border-t border-primary-700 mt-auto">
	<div class="max-w-5xl mx-auto px-6 py-7 text-xs text-primary-300 flex flex-col sm:flex-row items-center justify-between gap-2">
		<span>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?>. Timers keep running in this tab even while it's in the background.</span>
		<span>Theme made by <a href="https://kosmospc.com" class="no-underline text-primary-300 hover:text-secondary-200" target="_blank" rel="noopener">Kosmos Webhosting LLC</a> &middot; <a href="<?php echo esc_url( home_url( '/license/' ) ); ?>" class="no-underline text-primary-300 hover:text-secondary-200">BSD License</a></span>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
