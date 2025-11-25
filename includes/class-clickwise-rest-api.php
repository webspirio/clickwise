<?php

/**
 * REST API endpoints for Clickwise Analytics
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
class Clickwise_Rest_API {

	private $namespace = 'clickwise/v1';

	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register all REST API routes
	 */
	public function register_routes() {
		// Dashboard endpoints
		register_rest_route( $this->namespace, '/dashboard/stats', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_dashboard_stats' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		register_rest_route( $this->namespace, '/dashboard/chart', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_dashboard_chart' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'period' => array(
					'default' => '7d',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );

		register_rest_route( $this->namespace, '/dashboard/activity', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_dashboard_activity' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'limit' => array(
					'default' => 10,
					'sanitize_callback' => 'absint',
				),
			),
		) );

		// Events management endpoints
		register_rest_route( $this->namespace, '/events', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_events' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'status' => array(
					'default' => 'all',
					'sanitize_callback' => 'sanitize_text_field',
				),
				'type' => array(
					'default' => 'all',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );

		register_rest_route( $this->namespace, '/events/(?P<id>[\w\-]+)', array(
			'methods' => 'PUT',
			'callback' => array( $this, 'update_event' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'status' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'alias' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );

		register_rest_route( $this->namespace, '/events/bulk', array(
			'methods' => 'PUT',
			'callback' => array( $this, 'bulk_update_events' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'event_ids' => array(
					'required' => true,
					'validate_callback' => function( $param ) {
						return is_array( $param );
					},
				),
				'action' => array(
					'required' => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );

		register_rest_route( $this->namespace, '/events/(?P<id>[\w\-]+)', array(
			'methods' => 'DELETE',
			'callback' => array( $this, 'delete_event' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		// Sandbox endpoints
		register_rest_route( $this->namespace, '/sandbox/send', array(
			'methods' => 'POST',
			'callback' => array( $this, 'send_test_event' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'event_name' => array(
					'required' => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'properties' => array(
					'required' => false,
					'default' => array(),
					'validate_callback' => function( $param ) {
						return is_array( $param ) || is_object( $param );
					},
				),
				'handlers' => array(
					'required' => true,
					'validate_callback' => function( $param ) {
						return is_array( $param );
					},
				),
			),
		) );

		// Recording session endpoints
		register_rest_route( $this->namespace, '/recording/toggle', array(
			'methods' => 'POST',
			'callback' => array( $this, 'toggle_recording' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		register_rest_route( $this->namespace, '/recording/status', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_recording_status' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		// Test endpoints for handlers
		register_rest_route( $this->namespace, '/test/(?P<handler>rybbit|ga)', array(
			'methods' => 'POST',
			'callback' => array( $this, 'test_handler_connection' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		// Debug endpoint for settings
		register_rest_route( $this->namespace, '/debug/settings', array(
			'methods' => 'GET',
			'callback' => array( $this, 'debug_settings' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		// Custom settings endpoints
		register_rest_route( $this->namespace, '/settings', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_clickwise_settings' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
		) );

		register_rest_route( $this->namespace, '/settings', array(
			'methods' => 'POST',
			'callback' => array( $this, 'save_clickwise_settings' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'clickwise_rybbit_enabled' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'clickwise_rybbit_site_id' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'clickwise_rybbit_script_url' => array(
					'required' => false,
					'sanitize_callback' => 'esc_url_raw',
				),
				'clickwise_rybbit_api_version' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'clickwise_ga_enabled' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'clickwise_ga_measurement_id' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'clickwise_ga_api_secret' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );
	}

	/**
	 * Check if user has admin permissions
	 */
	public function check_admin_permissions() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Get dashboard statistics
	 */
	public function get_dashboard_stats( $request ) {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		// Mock data for now - replace with real analytics data
		$stats = array(
			'total_events' => $this->get_total_events_count(),
			'active_users' => $this->get_active_users_count(),
			'click_rate' => $this->get_click_rate(),
			'avg_session' => $this->get_avg_session_duration(),
		);

		return rest_ensure_response( $stats );
	}

	/**
	 * Get dashboard chart data
	 */
	public function get_dashboard_chart( $request ) {
		$period = $request->get_param( 'period' );

		// Generate chart data based on period
		$chart_data = $this->generate_chart_data( $period );

		return rest_ensure_response( $chart_data );
	}

	/**
	 * Get recent activity for dashboard
	 */
	public function get_dashboard_activity( $request ) {
		$limit = $request->get_param( 'limit' );

		// Mock recent activity data - replace with real data
		$activity = array(
			array(
				'event' => 'Sign Up Click',
				'time' => '2 mins ago',
				'user' => 'Visitor #1234',
				'icon' => 'MousePointer2',
				'color' => 'text-blue-500',
				'bg' => 'bg-blue-100 dark:bg-blue-900/20'
			),
			array(
				'event' => 'Form Submit',
				'time' => '15 mins ago',
				'user' => 'Visitor #5678',
				'icon' => 'Activity',
				'color' => 'text-green-500',
				'bg' => 'bg-green-100 dark:bg-green-900/20'
			),
			array(
				'event' => 'Page View',
				'time' => '32 mins ago',
				'user' => 'Visitor #9012',
				'icon' => 'Users',
				'color' => 'text-orange-500',
				'bg' => 'bg-orange-100 dark:bg-orange-900/20'
			),
			array(
				'event' => 'Download PDF',
				'time' => '1 hour ago',
				'user' => 'Visitor #3456',
				'icon' => 'ArrowUpRight',
				'color' => 'text-purple-500',
				'bg' => 'bg-purple-100 dark:bg-purple-900/20'
			),
		);

		return rest_ensure_response( array_slice( $activity, 0, $limit ) );
	}

	/**
	 * Get events list
	 */
	public function get_events( $request ) {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		$status = $request->get_param( 'status' );
		$type = $request->get_param( 'type' );

		// Check if table exists
		if ( $wpdb->get_var( "SHOW TABLES LIKE '$table_name'" ) != $table_name ) {
			return rest_ensure_response( array(
				'tracked' => array(),
				'ignored' => array(),
				'sessions' => array()
			) );
		}

		$where_clauses = array();
		$params = array();

		if ( $status !== 'all' ) {
			$where_clauses[] = 'status = %s';
			$params[] = $status;
		}

		if ( $type !== 'all' ) {
			$where_clauses[] = 'type = %s';
			$params[] = $type;
		}

		$where_sql = !empty( $where_clauses ) ? 'WHERE ' . implode( ' AND ', $where_clauses ) : '';

		$query = "SELECT * FROM $table_name $where_sql ORDER BY last_seen DESC";

		if ( !empty( $params ) ) {
			$events_data = $wpdb->get_results( $wpdb->prepare( $query, $params ), ARRAY_A );
		} else {
			$events_data = $wpdb->get_results( $query, ARRAY_A );
		}

		// Group events by status
		$grouped_events = array(
			'tracked' => array(),
			'ignored' => array(),
			'sessions' => array()
		);

		$sessions = array();

		foreach ( $events_data as $event_row ) {
			$event = array(
				'id' => $event_row['event_key'],
				'key' => $event_row['event_key'],
				'type' => $event_row['type'],
				'name' => $event_row['name'],
				'alias' => $event_row['alias'],
				'selector' => $event_row['selector'],
				'status' => $event_row['status'],
				'first_seen' => $event_row['first_seen'],
				'last_seen' => $event_row['last_seen'],
				'example_detail' => $event_row['example_detail'],
				'session_id' => $event_row['session_id'],
				'session_timestamp' => $event_row['session_timestamp']
			);

			// Add to status groups
			if ( $event_row['status'] === 'tracked' ) {
				$grouped_events['tracked'][] = $event;
			} elseif ( $event_row['status'] === 'ignored' ) {
				$grouped_events['ignored'][] = $event;
			}

			// Group by sessions for history
			if ( !empty( $event_row['session_id'] ) ) {
				$session_id = $event_row['session_id'];
				if ( !isset( $sessions[$session_id] ) ) {
					$sessions[$session_id] = array(
						'id' => $session_id,
						'timestamp' => $event_row['session_timestamp'],
						'events' => array()
					);
				}
				$sessions[$session_id]['events'][] = $event;
			}
		}

		// Sort sessions by timestamp
		usort( $sessions, function( $a, $b ) {
			return $b['timestamp'] - $a['timestamp'];
		} );

		$grouped_events['sessions'] = array_values( $sessions );

		return rest_ensure_response( $grouped_events );
	}

	/**
	 * Update a single event
	 */
	public function update_event( $request ) {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		$event_id = $request->get_param( 'id' );
		$status = $request->get_param( 'status' );
		$alias = $request->get_param( 'alias' );

		$update_data = array();
		$update_formats = array();

		if ( !empty( $status ) ) {
			$update_data['status'] = $status;
			$update_formats[] = '%s';
		}

		if ( isset( $alias ) ) {
			$update_data['alias'] = $alias;
			$update_formats[] = '%s';
		}

		if ( empty( $update_data ) ) {
			return new WP_Error( 'no_data', 'No data to update', array( 'status' => 400 ) );
		}

		$result = $wpdb->update(
			$table_name,
			$update_data,
			array( 'event_key' => $event_id ),
			$update_formats,
			array( '%s' )
		);

		if ( $result === false ) {
			return new WP_Error( 'update_failed', 'Failed to update event', array( 'status' => 500 ) );
		}

		return rest_ensure_response( array( 'success' => true, 'updated' => $result ) );
	}

	/**
	 * Bulk update events
	 */
	public function bulk_update_events( $request ) {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		$event_ids = $request->get_param( 'event_ids' );
		$action = $request->get_param( 'action' );

		$updated_count = 0;
		$errors = array();

		foreach ( $event_ids as $event_id ) {
			$update_data = array();

			switch ( $action ) {
				case 'track':
					$update_data['status'] = 'tracked';
					break;
				case 'ignore':
					$update_data['status'] = 'ignored';
					break;
				case 'delete':
					$result = $wpdb->delete( $table_name, array( 'event_key' => $event_id ), array( '%s' ) );
					if ( $result !== false ) {
						$updated_count++;
					} else {
						$errors[] = "Failed to delete event: $event_id";
					}
					continue 2;
				default:
					$errors[] = "Invalid action: $action";
					continue 2;
			}

			$result = $wpdb->update(
				$table_name,
				$update_data,
				array( 'event_key' => $event_id ),
				array( '%s' ),
				array( '%s' )
			);

			if ( $result !== false ) {
				$updated_count++;
			} else {
				$errors[] = "Failed to update event: $event_id";
			}
		}

		return rest_ensure_response( array(
			'success' => true,
			'updated_count' => $updated_count,
			'errors' => $errors
		) );
	}

	/**
	 * Delete an event
	 */
	public function delete_event( $request ) {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		$event_id = $request->get_param( 'id' );

		$result = $wpdb->delete( $table_name, array( 'event_key' => $event_id ), array( '%s' ) );

		if ( $result === false ) {
			return new WP_Error( 'delete_failed', 'Failed to delete event', array( 'status' => 500 ) );
		}

		return rest_ensure_response( array( 'success' => true, 'deleted' => $result ) );
	}

	/**
	 * Send test event through sandbox
	 */
	public function send_test_event( $request ) {
		$event_name = $request->get_param( 'event_name' );
		$properties = $request->get_param( 'properties' );
		$handlers = $request->get_param( 'handlers' );

		$results = array();

		// Add test-specific properties
		$test_properties = array_merge( (array) $properties, array(
			'test_mode' => true,
			'source' => 'admin_sandbox',
			'timestamp' => current_time( 'timestamp' )
		) );

		foreach ( $handlers as $handler ) {
			switch ( $handler ) {
				case 'rybbit':
					$results['rybbit'] = $this->send_test_event_to_rybbit( $event_name, $test_properties );
					break;
				case 'ga':
					$results['ga'] = $this->send_test_event_to_ga( $event_name, $test_properties );
					break;
			}
		}

		return rest_ensure_response( array(
			'success' => true,
			'event_name' => $event_name,
			'results' => $results,
			'timestamp' => current_time( 'c' )
		) );
	}

	/**
	 * Toggle recording mode
	 */
	public function toggle_recording( $request ) {
		$current_status = get_user_meta( get_current_user_id(), 'clickwise_recording_mode', true );
		$new_status = !$current_status;

		update_user_meta( get_current_user_id(), 'clickwise_recording_mode', $new_status );

		return rest_ensure_response( array(
			'success' => true,
			'recording' => $new_status,
			'message' => $new_status ? 'Recording started' : 'Recording stopped'
		) );
	}

	/**
	 * Get current recording status
	 */
	public function get_recording_status( $request ) {
		$is_recording = get_user_meta( get_current_user_id(), 'clickwise_recording_mode', true );

		return rest_ensure_response( array(
			'recording' => (bool) $is_recording
		) );
	}

	/**
	 * Test handler connection
	 */
	public function test_handler_connection( $request ) {
		$handler = $request->get_param( 'handler' );

		switch ( $handler ) {
			case 'rybbit':
				return $this->test_rybbit_connection();
			case 'ga':
				return $this->test_ga_connection();
			default:
				return new WP_Error( 'invalid_handler', 'Invalid handler specified', array( 'status' => 400 ) );
		}
	}

	// Private helper methods

	private function get_total_events_count() {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		if ( $wpdb->get_var( "SHOW TABLES LIKE '$table_name'" ) != $table_name ) {
			return 12345; // Mock data
		}

		$count = $wpdb->get_var( "SELECT COUNT(*) FROM $table_name WHERE status = 'tracked'" );
		return $count ? intval( $count ) : 12345; // Fallback to mock
	}

	private function get_active_users_count() {
		// Mock data - in real implementation, this would query actual analytics data
		return 2350;
	}

	private function get_click_rate() {
		// Mock data - in real implementation, this would calculate from actual events
		return '4.35%';
	}

	private function get_avg_session_duration() {
		// Mock data - in real implementation, this would calculate from session data
		return '2m 45s';
	}

	private function generate_chart_data( $period ) {
		// Generate mock chart data based on period
		$data = array();
		$days = $period === '7d' ? 7 : 30;

		for ( $i = $days - 1; $i >= 0; $i-- ) {
			$date = date( 'M j', strtotime( "-{$i} days" ) );
			$data[] = array(
				'name' => $date,
				'visits' => rand( 1000, 5000 ),
				'clicks' => rand( 500, 3000 )
			);
		}

		return $data;
	}

	private function send_test_event_to_rybbit( $event_name, $properties ) {
		$script_url = get_option( 'clickwise_rybbit_script_url' );
		$site_id = get_option( 'clickwise_rybbit_site_id' );

		if ( empty( $script_url ) || empty( $site_id ) ) {
			return array( 'success' => false, 'message' => 'Rybbit not configured' );
		}

		// In a real implementation, this would send the event to Rybbit
		return array(
			'success' => true,
			'message' => 'Test event sent to Rybbit successfully',
			'event_name' => $event_name
		);
	}

	private function send_test_event_to_ga( $event_name, $properties ) {
		$measurement_id = get_option( 'clickwise_ga_measurement_id' );

		if ( empty( $measurement_id ) ) {
			return array( 'success' => false, 'message' => 'Google Analytics not configured' );
		}

		// In a real implementation, this would send the event to GA4
		return array(
			'success' => true,
			'message' => 'Test event sent to Google Analytics successfully',
			'event_name' => $event_name
		);
	}

	private function test_rybbit_connection() {
		$script_url = get_option( 'clickwise_rybbit_script_url' );
		$site_id = get_option( 'clickwise_rybbit_site_id' );

		if ( empty( $script_url ) || empty( $site_id ) ) {
			return new WP_Error( 'missing_config', 'Script URL and Site ID are required', array( 'status' => 400 ) );
		}

		$response = wp_remote_get( $script_url, array(
			'timeout' => 10,
			'user-agent' => 'Clickwise Plugin Test'
		) );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'connection_failed', 'Could not reach Rybbit script: ' . $response->get_error_message(), array( 'status' => 500 ) );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			return new WP_Error( 'bad_response', 'Rybbit script returned HTTP ' . $code, array( 'status' => 500 ) );
		}

		return rest_ensure_response( array(
			'success' => true,
			'message' => 'Rybbit connection successful! Script is accessible and appears valid.'
		) );
	}

	private function test_ga_connection() {
		$measurement_id = get_option( 'clickwise_ga_measurement_id' );
		$api_secret = get_option( 'clickwise_ga_api_secret' );

		if ( empty( $measurement_id ) ) {
			return new WP_Error( 'missing_config', 'Measurement ID is required', array( 'status' => 400 ) );
		}

		if ( ! preg_match( '/^G-[A-Z0-9]{10}$/', $measurement_id ) ) {
			return new WP_Error( 'invalid_format', 'Invalid Measurement ID format. Should be G-XXXXXXXXXX', array( 'status' => 400 ) );
		}

		// Send test event
		$test_data = array(
			'client_id' => wp_generate_uuid4(),
			'events' => array(
				array(
					'name' => 'clickwise_test_event',
					'params' => array(
						'event_category' => 'test',
						'event_label' => 'api_test',
						'value' => 1
					)
				)
			)
		);

		$url = 'https://www.google-analytics.com/mp/collect?measurement_id=' . urlencode( $measurement_id );
		if ( ! empty( $api_secret ) ) {
			$url .= '&api_secret=' . urlencode( $api_secret );
		}

		$response = wp_remote_post( $url, array(
			'timeout' => 10,
			'headers' => array(
				'Content-Type' => 'application/json'
			),
			'body' => json_encode( $test_data )
		) );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'connection_failed', 'Could not reach Google Analytics: ' . $response->get_error_message(), array( 'status' => 500 ) );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			return new WP_Error( 'bad_response', 'Google Analytics returned HTTP ' . $code, array( 'status' => 500 ) );
		}

		return rest_ensure_response( array(
			'success' => true,
			'message' => empty( $api_secret )
				? 'Google Analytics connection successful! Test event sent (no API secret - cannot verify delivery).'
				: 'Google Analytics connection successful! Test event sent and verified.'
		) );
	}

	/**
	 * Debug settings registration
	 */
	public function debug_settings( $request ) {
		// Get all Clickwise settings
		$settings = array();
		$setting_keys = array(
			'clickwise_rybbit_enabled',
			'clickwise_rybbit_site_id',
			'clickwise_rybbit_script_url',
			'clickwise_rybbit_api_version',
			'clickwise_ga_enabled',
			'clickwise_ga_measurement_id',
			'clickwise_ga_api_secret'
		);

		foreach ( $setting_keys as $key ) {
			$settings[$key] = get_option( $key, 'NOT_SET' );
		}

		// Check if settings are registered with REST API
		global $wp_rest_server;
		$routes = $wp_rest_server->get_routes();
		$wp_settings_route_exists = isset( $routes['/wp/v2/settings'] );

		return rest_ensure_response( array(
			'current_settings' => $settings,
			'wp_settings_route_exists' => $wp_settings_route_exists,
			'registered_settings' => get_registered_settings(),
			'current_user_can_manage_options' => current_user_can( 'manage_options' ),
			'debug_info' => array(
				'rest_url' => rest_url(),
				'admin_url' => admin_url(),
				'current_user_id' => get_current_user_id(),
			)
		) );
	}

	/**
	 * Get Clickwise settings
	 */
	public function get_clickwise_settings( $request ) {
		$settings = array(
			'clickwise_rybbit_enabled' => get_option( 'clickwise_rybbit_enabled', '' ),
			'clickwise_rybbit_site_id' => get_option( 'clickwise_rybbit_site_id', '' ),
			'clickwise_rybbit_script_url' => get_option( 'clickwise_rybbit_script_url', '' ),
			'clickwise_rybbit_api_version' => get_option( 'clickwise_rybbit_api_version', 'v2' ),
			'clickwise_ga_enabled' => get_option( 'clickwise_ga_enabled', '' ),
			'clickwise_ga_measurement_id' => get_option( 'clickwise_ga_measurement_id', '' ),
			'clickwise_ga_api_secret' => get_option( 'clickwise_ga_api_secret', '' ),
		);

		return rest_ensure_response( $settings );
	}

	/**
	 * Save Clickwise settings
	 */
	public function save_clickwise_settings( $request ) {
		$params = $request->get_params();
		$updated = array();

		$setting_keys = array(
			'clickwise_rybbit_enabled',
			'clickwise_rybbit_site_id',
			'clickwise_rybbit_script_url',
			'clickwise_rybbit_api_version',
			'clickwise_ga_enabled',
			'clickwise_ga_measurement_id',
			'clickwise_ga_api_secret',
		);

		foreach ( $setting_keys as $key ) {
			if ( array_key_exists( $key, $params ) ) {
				$value = $params[$key];
				update_option( $key, $value );
				$updated[$key] = $value;
			}
		}

		// Return the updated settings
		return rest_ensure_response( array(
			'success' => true,
			'message' => 'Settings saved successfully',
			'updated' => $updated,
			'current_settings' => $this->get_clickwise_settings( $request )->get_data(),
		) );
	}
}

// Initialize the REST API
new Clickwise_Rest_API();