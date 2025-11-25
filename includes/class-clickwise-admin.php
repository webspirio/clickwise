<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       https://webspirio.com
 * @since      1.0.0
 *
 * @package    Webspirio_Clickwise_Analytics
 * @subpackage Webspirio_Clickwise_Analytics/includes
 * @author     Webspirio (Oleksandr Chornous) <contact@webspirio.com>
 *
 * Copyright (c) 2025 Webspirio
 * Licensed under GPLv2 or later
 */
class Clickwise_Admin {

	private $plugin_name;
	private $version;

	public function __construct( $plugin_name, $version ) {
		$this->plugin_name = $plugin_name;
		$this->version     = $version;
	}

	public function add_admin_menu() {
		add_options_page(
			'Clickwise Analytics',
			'Clickwise Analytics',
			'manage_options',
			'clickwise-settings',
			array( $this, 'display_options_page' )
		);
	}

	public function add_admin_bar_menu( $wp_admin_bar ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$is_recording = get_user_meta( get_current_user_id(), 'clickwise_recording_mode', true );
		$title = $is_recording ? '● Recording Events' : 'Clickwise Analytics';
		
		$meta = array();
		if ( $is_recording ) {
			$meta['class'] = 'clickwise-recording-active';
		}

		$wp_admin_bar->add_node( array(
			'id'    => 'clickwise-analytics',
			'title' => $title,
			'href'  => admin_url( 'options-general.php?page=clickwise-settings&tab=events_manager' ),
			'meta'  => $meta
		) );

		$wp_admin_bar->add_node( array(
			'id'     => 'clickwise-toggle-recording',
			'parent' => 'clickwise-analytics',
			'title'  => $is_recording ? 'Stop Recording' : 'Start Recording',
			'href'   => '#',
			'meta'   => array(
				'onclick' => 'clickwiseToggleRecording(event)',
			),
		) );

		$wp_admin_bar->add_node( array(
			'id'     => 'clickwise-manage-events',
			'parent' => 'clickwise-analytics',
			'title'  => 'Manage Events',
			'href'   => admin_url( 'options-general.php?page=clickwise-settings&tab=events_manager' ),
		) );
	}

	public function enqueue_admin_scripts( $hook ) {
		// Enqueue on settings page AND frontend (for admin bar)
		if ( 'settings_page_clickwise-settings' === $hook || ! is_admin() ) {
			if ( is_user_logged_in() && current_user_can( 'manage_options' ) ) {
				
				$is_dev = defined( 'CLICKWISE_REACT_DEV' ) && CLICKWISE_REACT_DEV;
				// Auto-detect dev mode if localhost:5173 is reachable (optional, but manual constant is safer for now)
				// For this environment, let's assume dev mode if the constant is not defined but we are in a local env
				if ( ! defined( 'CLICKWISE_REACT_DEV' ) && ( wp_get_environment_type() === 'local' || wp_get_environment_type() === 'development' ) ) {
					$is_dev = true;
				}

				if ( $is_dev ) {
					// Vite Dev Server
					wp_enqueue_script( 'clickwise-vite-client', 'http://localhost:5173/@vite/client', array(), null, true );
					wp_enqueue_script( 'clickwise-react-app', 'http://localhost:5173/src/main.tsx', array( 'clickwise-vite-client' ), null, true );
				} else {
					// Production Build
					$manifest_path = CLICKWISE_PATH . 'assets/dist/.vite/manifest.json';
					if ( file_exists( $manifest_path ) ) {
						$manifest = json_decode( file_get_contents( $manifest_path ), true );
						if ( isset( $manifest['src/main.tsx'] ) ) {
							$entry = $manifest['src/main.tsx'];
							wp_enqueue_script( 'clickwise-react-app', CLICKWISE_URL . 'assets/dist/' . $entry['file'], array(), CLICKWISE_VERSION, true );
							if ( isset( $entry['css'] ) ) {
								foreach ( $entry['css'] as $css_file ) {
									wp_enqueue_style( 'clickwise-react-css', CLICKWISE_URL . 'assets/dist/' . $css_file, array(), CLICKWISE_VERSION );
								}
							}
						}
					}
				}

				// Pass data to React
				wp_localize_script( 'clickwise-react-app', 'clickwiseSettings', array(
					'ajaxUrl' => admin_url( 'admin-ajax.php' ),
					'nonce'    => wp_create_nonce( 'clickwise_admin_nonce' ),
					'restUrl' => esc_url_raw( rest_url() ),
					'restNonce' => wp_create_nonce( 'wp_rest' ),
					'scriptUrl' => get_option( 'clickwise_script_url' ),
					'siteId'    => get_option( 'clickwise_site_id' ),
					'currentUser' => wp_get_current_user(),
					'activeTab' => isset( $_GET['tab'] ) ? $_GET['tab'] : 'general',
					'rybbitEnabled' => get_option( 'clickwise_rybbit_enabled' ),
					'gaEnabled' => get_option( 'clickwise_ga_enabled' ),
				) );

				// Add module type for Vite scripts
				add_filter( 'script_loader_tag', array( $this, 'add_type_attribute' ), 10, 3 );
			}
		}
	}

	public function add_type_attribute( $tag, $handle, $src ) {
		if ( 'clickwise-vite-client' === $handle || 'clickwise-react-app' === $handle ) {
			$tag = '<script type="module" src="' . esc_url( $src ) . '"></script>';
		}
		return $tag;
	}

	public function register_settings() {
		// --- Rybbit Handler Settings ---
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_enabled', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_script_url', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_site_id', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_api_version', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => 'v2',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_domain', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => 'https://app.rybbit.io',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_script_path', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '/api/script.js',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_tracking_id', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_website_id', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_api_key', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );

		// --- Google Analytics Settings ---
		register_setting( 'clickwise-settings-ga', 'clickwise_ga_enabled', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-ga', 'clickwise_ga_measurement_id', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-ga', 'clickwise_ga_api_secret', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
	}

	public function display_options_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div id="clickwise-admin-app"></div>
		<?php
	}
}
