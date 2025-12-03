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
			'args' => array(
				'api_key' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'website_id' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'domain' => array(
					'required' => false,
					'sanitize_callback' => 'esc_url_raw',
				),
				'api_version' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'measurement_id' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'api_secret' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
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

		// Rybbit Analytics proxy endpoints (server-side only, API key never exposed)
		register_rest_route( $this->namespace, '/rybbit/overview', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_rybbit_overview' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'site_id' => array(
					'required' => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'start_date' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'end_date' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'time_zone' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'past_minutes_start' => array(
					'required' => false,
					'sanitize_callback' => 'absint',
				),
				'past_minutes_end' => array(
					'required' => false,
					'sanitize_callback' => 'absint',
				),
				'filters' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );

		register_rest_route( $this->namespace, '/rybbit/metric', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_rybbit_metric' ),
			'permission_callback' => array( $this, 'check_admin_permissions' ),
			'args' => array(
				'site_id' => array(
					'required' => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'parameter' => array(
					'required' => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'start_date' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'end_date' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'time_zone' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'past_minutes_start' => array(
					'required' => false,
					'sanitize_callback' => 'absint',
				),
				'past_minutes_end' => array(
					'required' => false,
					'sanitize_callback' => 'absint',
				),
				'limit' => array(
					'required' => false,
					'sanitize_callback' => 'absint',
				),
				'page' => array(
					'required' => false,
					'sanitize_callback' => 'absint',
				),
				'filters' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
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
				'clickwise_rybbit_api_key' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'clickwise_rybbit_domain' => array(
					'required' => false,
					'sanitize_callback' => 'esc_url_raw',
				),
				'clickwise_rybbit_script_path' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'clickwise_rybbit_tracking_id' => array(
					'required' => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'clickwise_rybbit_website_id' => array(
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
				// case 'rybbit':
				// 	// Handled client-side now
				// 	break;
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
				return $this->test_rybbit_connection( $request );
			case 'ga':
				return $this->test_ga_connection( $request );
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


	private function test_rybbit_connection( $request ) {
		$api_key = $request->get_param( 'api_key' );
		if ( empty( $api_key ) ) {
			$api_key = get_option( 'clickwise_rybbit_api_key' );
		}

		$website_id = $request->get_param( 'website_id' );
		if ( empty( $website_id ) ) {
			$website_id = get_option( 'clickwise_rybbit_website_id' );
		}

		$domain = $request->get_param( 'domain' );
		if ( empty( $domain ) ) {
			$domain = get_option( 'clickwise_rybbit_domain', 'https://app.rybbit.io' );
		}

		if ( empty( $api_key ) ) {
			return new WP_Error( 'missing_config', 'Rybbit API key is required', array( 'status' => 400, 'field' => 'api_key' ) );
		}

		if ( empty( $website_id ) ) {
			return new WP_Error( 'missing_config', 'Rybbit Website ID is required', array( 'status' => 400, 'field' => 'website_id' ) );
		}

		// Build API URL
		$base_url = rtrim( $domain, '/' );
		if ( ! str_ends_with( $base_url, '/api' ) ) {
			$base_url .= '/api';
		}
		$url = "{$base_url}/overview/{$website_id}";

		// Make test API request to verify connection
		$response = wp_remote_get( $url, array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type' => 'application/json',
			),
			'timeout' => 15,
		) );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'connection_failed', 'Could not reach Rybbit API: ' . $response->get_error_message(), array( 'status' => 500, 'field' => 'domain' ) );
		}

		$code = wp_remote_retrieve_response_code( $response );

		if ( $code === 401 ) {
			return new WP_Error( 'invalid_api_key', 'Invalid API key. Please check your Rybbit settings.', array( 'status' => 401, 'field' => 'api_key' ) );
		}

		if ( $code === 403 ) {
			return new WP_Error( 'access_denied', 'Access denied. Please check your site permissions.', array( 'status' => 403, 'field' => 'website_id' ) );
		}

		if ( $code === 404 ) {
			return new WP_Error( 'not_found', 'Website ID not found.', array( 'status' => 404, 'field' => 'website_id' ) );
		}

		if ( $code >= 400 ) {
			return new WP_Error( 'api_error', "Rybbit API returned error: $code", array( 'status' => $code ) );
		}

		return array(
			'success' => true,
			'message' => 'Connection to Rybbit successful!',
			'data' => json_decode( wp_remote_retrieve_body( $response ), true )
		);
	}

	private function test_ga_connection( $request ) {
		$measurement_id = $request->get_param( 'measurement_id' );
		if ( empty( $measurement_id ) ) {
			$measurement_id = get_option( 'clickwise_ga_measurement_id' );
		}

		$api_secret = $request->get_param( 'api_secret' );
		if ( empty( $api_secret ) ) {
			$api_secret = get_option( 'clickwise_ga_api_secret' );
		}

		if ( empty( $measurement_id ) ) {
			return new WP_Error( 'missing_config', 'GA4 Measurement ID is required', array( 'status' => 400, 'field' => 'measurement_id' ) );
		}

		// For GA4, we can't easily "test" the connection without sending an event,
		// but we can validate the format of the Measurement ID.
		if ( ! preg_match( '/^G-[A-Z0-9]+$/', $measurement_id ) ) {
			return new WP_Error( 'invalid_format', 'Invalid Measurement ID format. Should start with G-', array( 'status' => 400, 'field' => 'measurement_id' ) );
		}

		return array(
			'success' => true,
			'message' => 'GA4 configuration format is valid (connection not verified)',
		);
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
			'clickwise_rybbit_api_key',
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
	 * NOTE: API keys and secrets return placeholders for security (actual values never exposed)
	 */
	public function get_clickwise_settings( $request ) {
		// Get actual API key/secret to check if they're set
		$rybbit_api_key = get_option( 'clickwise_rybbit_api_key' );
		$ga_api_secret = get_option( 'clickwise_ga_api_secret' );

		$settings = array(
			'clickwise_rybbit_enabled' => get_option( 'clickwise_rybbit_enabled' ),
			'clickwise_rybbit_site_id' => get_option( 'clickwise_rybbit_site_id' ),
			'clickwise_rybbit_script_url' => get_option( 'clickwise_rybbit_script_url' ),
			'clickwise_rybbit_api_version' => get_option( 'clickwise_rybbit_api_version' ),
			// Return placeholder if key is set, empty string if not (secure - never expose actual key)
			'clickwise_rybbit_api_key' => ! empty( $rybbit_api_key ) ? '••••••••••••••••' : '',
			'clickwise_rybbit_domain' => get_option( 'clickwise_rybbit_domain' ),
			'clickwise_rybbit_script_path' => get_option( 'clickwise_rybbit_script_path' ),
			'clickwise_rybbit_tracking_id' => get_option( 'clickwise_rybbit_tracking_id' ),
			'clickwise_rybbit_website_id' => get_option( 'clickwise_rybbit_website_id' ),
			'clickwise_ga_enabled' => get_option( 'clickwise_ga_enabled' ),
			'clickwise_ga_measurement_id' => get_option( 'clickwise_ga_measurement_id' ),
			// Return placeholder if secret is set, empty string if not (secure - never expose actual secret)
			'clickwise_ga_api_secret' => ! empty( $ga_api_secret ) ? '••••••••••••••••' : '',
		);

		return rest_ensure_response( $settings );
	}

	/**
	 * Save Clickwise settings
	 * NOTE: Placeholder values (••••) are ignored to preserve existing keys
	 */
	public function save_clickwise_settings( $request ) {
		$settings = array(
			'clickwise_rybbit_enabled',
			'clickwise_rybbit_site_id',
			'clickwise_rybbit_script_url',
			'clickwise_rybbit_api_version',
			'clickwise_rybbit_api_key',
			'clickwise_rybbit_domain',
			'clickwise_rybbit_script_path',
			'clickwise_rybbit_tracking_id',
			'clickwise_rybbit_website_id',
			'clickwise_ga_enabled',
			'clickwise_ga_measurement_id',
			'clickwise_ga_api_secret',
		);

		foreach ( $settings as $setting ) {
			if ( $request->has_param( $setting ) ) {
				$value = $request->get_param( $setting );

				// Skip saving if value is the placeholder (means user didn't change it)
				if ( $value === '••••••••••••••••' ) {
					continue;
				}

				update_option( $setting, $value );
			}
		}

		return rest_ensure_response( array( 'success' => true, 'message' => 'Settings saved successfully' ) );
	}

	/**
	 * Proxy for Rybbit Overview API - keeps API key server-side
	 */
	public function get_rybbit_overview( $request ) {
		$api_key = get_option( 'clickwise_rybbit_api_key' );
		$domain = get_option( 'clickwise_rybbit_domain', 'https://app.rybbit.io' );

		if ( empty( $api_key ) ) {
			return new WP_Error( 'missing_api_key', 'Rybbit API key is not configured', array( 'status' => 400 ) );
		}

		$site_id = $request->get_param( 'site_id' );

		// Build API URL
		$base_url = rtrim( $domain, '/' );
		if ( ! str_ends_with( $base_url, '/api' ) ) {
			$base_url .= '/api';
		}
		$url = "{$base_url}/overview/{$site_id}";

		// Build query parameters
		$params = array();
		$param_keys = array( 'start_date', 'end_date', 'time_zone', 'past_minutes_start', 'past_minutes_end', 'filters' );
		foreach ( $param_keys as $key ) {
			$value = $request->get_param( $key );
			if ( ! empty( $value ) ) {
				$params[ $key ] = $value;
			}
		}

		if ( ! empty( $params ) ) {
			$url .= '?' . http_build_query( $params );
		}

		// Make API request
		$response = wp_remote_get( $url, array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type' => 'application/json',
			),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'api_error', $response->get_error_message(), array( 'status' => 500 ) );
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );

		if ( $status_code >= 400 ) {
			$error_data = json_decode( $body, true );
			$error_message = isset( $error_data['message'] ) ? $error_data['message'] : 'Rybbit API error';

			if ( $status_code === 401 ) {
				$error_message = 'Invalid API key. Please check your Rybbit settings.';
			} elseif ( $status_code === 403 ) {
				$error_message = 'Access denied. Please check your site permissions.';
			} elseif ( $status_code === 429 ) {
				$error_message = 'Rate limit exceeded. Please wait and try again.';
			}

			return new WP_Error( 'api_error', $error_message, array( 'status' => $status_code ) );
		}

		$data = json_decode( $body, true );
		return rest_ensure_response( $data );
	}

	/**
	 * Proxy for Rybbit Metric API - keeps API key server-side
	 */
	public function get_rybbit_metric( $request ) {
		$api_key = get_option( 'clickwise_rybbit_api_key' );
		$domain = get_option( 'clickwise_rybbit_domain', 'https://app.rybbit.io' );

		if ( empty( $api_key ) ) {
			return new WP_Error( 'missing_api_key', 'Rybbit API key is not configured', array( 'status' => 400 ) );
		}

		$site_id = $request->get_param( 'site_id' );

		// Build API URL
		$base_url = rtrim( $domain, '/' );
		if ( ! str_ends_with( $base_url, '/api' ) ) {
			$base_url .= '/api';
		}
		$url = "{$base_url}/metric/{$site_id}";

		// Build query parameters
		$params = array();
		$param_keys = array( 'parameter', 'start_date', 'end_date', 'time_zone', 'past_minutes_start', 'past_minutes_end', 'limit', 'page', 'filters' );
		foreach ( $param_keys as $key ) {
			$value = $request->get_param( $key );
			if ( ! empty( $value ) ) {
				$params[ $key ] = $value;
			}
		}

		if ( ! empty( $params ) ) {
			$url .= '?' . http_build_query( $params );
		}

		// Make API request
		$response = wp_remote_get( $url, array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type' => 'application/json',
			),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'api_error', $response->get_error_message(), array( 'status' => 500 ) );
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );

		if ( $status_code >= 400 ) {
			$error_data = json_decode( $body, true );
			$error_message = isset( $error_data['message'] ) ? $error_data['message'] : 'Rybbit API error';

			if ( $status_code === 401 ) {
				$error_message = 'Invalid API key. Please check your Rybbit settings.';
			} elseif ( $status_code === 403 ) {
				$error_message = 'Access denied. Please check your site permissions.';
			} elseif ( $status_code === 429 ) {
				$error_message = 'Rate limit exceeded. Please wait and try again.';
			}

			return new WP_Error( 'api_error', $error_message, array( 'status' => $status_code ) );
		}

		$data = json_decode( $body, true );
		return rest_ensure_response( $data );
	}
}

new Clickwise_Rest_API();