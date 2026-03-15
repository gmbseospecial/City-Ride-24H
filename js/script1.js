(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.WvcUtils = {}));
})(this, (function (exports) { 'use strict';

    class WPClient {
        constructor(config) {
            this.baseUrl = config.baseUrl;
            this.auth = config.auth;
            this.cache = config.cache;
        }
        buildUrl(endpoint, params, namespace = "wp/v2") {
            const searchParams = new URLSearchParams();
            // Set the REST route parameter with custom namespace
            searchParams.set("rest_route", `/${namespace}/${endpoint}`);
            // Add other parameters if they exist
            if (params) {
                for (const [key, value] of Object.entries(params)) {
                    if (value !== undefined && value !== null) {
                        if (Array.isArray(value)) {
                            value.forEach((item) => {
                                searchParams.append(key, item.toString());
                            });
                        }
                        else {
                            searchParams.set(key, value.toString());
                        }
                    }
                }
            }
            return `${this.baseUrl}?${searchParams.toString()}`;
        }
        getHeaders() {
            const headers = {
                "Content-Type": "application/json"
            };
            if (this.auth) {
                if ("username" in this.auth && "password" in this.auth) {
                    const credentials = btoa(`${this.auth.username}:${this.auth.password}`);
                    headers["Authorization"] = `Basic ${credentials}`;
                }
                else if ("token" in this.auth) {
                    headers["Authorization"] = `Bearer ${this.auth.token}`;
                }
            }
            return headers;
        }
        async handleResponse(response) {
            const headers = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            if (!response.ok) {
                let error;
                try {
                    const errorData = await response.json();
                    error = {
                        code: errorData.code || "unknown_error",
                        message: errorData.message || "An unknown error occurred",
                        data: errorData.data || { status: response.status }
                    };
                }
                catch (_a) {
                    error = {
                        code: "http_error",
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        data: { status: response.status }
                    };
                }
                throw error;
            }
            const data = await response.json();
            return {
                data,
                headers,
                status: response.status
            };
        }
        async request(endpoint, params, options = {}) {
            const url = this.buildUrl(endpoint, params);
            const config = {
                ...options,
                headers: {
                    ...this.getHeaders(),
                    ...options.headers
                }
            };
            const response = await fetch(url, config);
            return this.handleResponse(response);
        }
        async get(endpoint, params, flushCache = false) {
            const methodName = `get_${endpoint}`;
            const args = [endpoint, params];
            // Check cache first (unless flushCache is true)
            if (!flushCache && this.cache) {
                const cachedData = this.cache.get(methodName, args);
                if (cachedData) {
                    return cachedData;
                }
            }
            // Make request
            const response = await this.request(endpoint, params, { method: "GET" });
            // Store in cache (only cache successful responses)
            if (response.status >= 200 && response.status < 300 && this.cache) {
                this.cache.set(methodName, args, response);
            }
            return response;
        }
        /**
         * Make a GET request with a custom namespace
         * @param endpoint - The endpoint path
         * @param params - Query parameters
         * @param namespace - Custom namespace (default: wp/v2)
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<T>>
         */
        async getWithNamespace(endpoint, params, namespace = "wp/v2", flushCache = false) {
            const url = this.buildUrl(endpoint, params, namespace);
            const methodName = `getWithNamespace_${namespace}_${endpoint}`;
            const args = [endpoint, params, namespace];
            // Check cache first (unless flushCache is true)
            if (!flushCache && this.cache) {
                const cachedData = this.cache.get(methodName, args);
                if (cachedData) {
                    return cachedData;
                }
            }
            const config = {
                method: "GET",
                headers: this.getHeaders()
            };
            const response = await fetch(url, config);
            const result = await this.handleResponse(response);
            // Store in cache (only cache successful responses)
            if (result.status >= 200 && result.status < 300 && this.cache) {
                this.cache.set(methodName, args, result);
            }
            return result;
        }
        /**
         * Make a POST request with a custom namespace
         * @param endpoint - The endpoint path
         * @param data - Request body data
         * @param params - Query parameters
         * @param namespace - Custom namespace (default: wp/v2)
         * @returns Promise<WPResponse<T>>
         */
        async postWithNamespace(endpoint, data, params, namespace = "wp/v2") {
            const url = this.buildUrl(endpoint, params, namespace);
            const config = {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            };
            const response = await fetch(url, config);
            const result = await this.handleResponse(response);
            return result;
        }
        async post(endpoint, data, params) {
            const response = await this.request(endpoint, params, {
                method: "POST",
                body: JSON.stringify(data)
            });
            return response;
        }
        async put(endpoint, data, params) {
            const response = await this.request(endpoint, params, {
                method: "PUT",
                body: JSON.stringify(data)
            });
            return response;
        }
        async delete(endpoint, params) {
            const response = await this.request(endpoint, params, { method: "DELETE" });
            return response;
        }
        /**
         * Get cache statistics
         * @returns Cache statistics
         */
        getCacheStats() {
            var _a;
            return ((_a = this.cache) === null || _a === void 0 ? void 0 : _a.getStats()) || null;
        }
        /**
         * Clear all cache entries
         */
        clearCache() {
            var _a;
            (_a = this.cache) === null || _a === void 0 ? void 0 : _a.clear();
        }
        /**
         * Flush expired cache entries
         */
        flushCache() {
            var _a;
            (_a = this.cache) === null || _a === void 0 ? void 0 : _a.flushExpired();
        }
        /**
         * Clear cache entries by method name pattern
         * @param methodPattern - Method name pattern (regex string)
         * @returns Number of entries cleared
         */
        clearCacheByMethod(methodPattern) {
            var _a;
            return ((_a = this.cache) === null || _a === void 0 ? void 0 : _a.clearByMethod(methodPattern)) || 0;
        }
        /**
         * Flush cache for a specific method and arguments
         * @param methodName - Method name
         * @param args - Method arguments
         */
        flushCacheForMethod(methodName, args = []) {
            var _a;
            (_a = this.cache) === null || _a === void 0 ? void 0 : _a.flush(methodName, args);
        }
        /**
         * Enable cache
         */
        enableCache() {
            var _a;
            (_a = this.cache) === null || _a === void 0 ? void 0 : _a.enable();
        }
        /**
         * Disable cache and clear all entries
         */
        disableCache() {
            var _a;
            (_a = this.cache) === null || _a === void 0 ? void 0 : _a.disable();
        }
        /**
         * Check if cache is enabled
         * @returns True if cache is enabled
         */
        isCacheEnabled() {
            var _a;
            return ((_a = this.cache) === null || _a === void 0 ? void 0 : _a.isEnabled()) || false;
        }
        /**
         * Update cache configuration
         * @param config - New cache configuration
         */
        updateCacheConfig(config) {
            var _a;
            (_a = this.cache) === null || _a === void 0 ? void 0 : _a.updateConfig(config);
        }
        /**
         * Get cache configuration
         * @returns Current cache configuration
         */
        getCacheConfig() {
            var _a;
            return ((_a = this.cache) === null || _a === void 0 ? void 0 : _a.getConfig()) || null;
        }
        /**
         * Get cache entries for debugging
         * @returns Array of cache entries
         */
        getCacheEntries() {
            var _a;
            return ((_a = this.cache) === null || _a === void 0 ? void 0 : _a.getEntries()) || [];
        }
        /**
         * Get cache entries for a specific method
         * @param methodName - Method name to filter by
         * @returns Array of matching cache entries
         */
        getCacheEntriesByMethod(methodName) {
            var _a;
            return ((_a = this.cache) === null || _a === void 0 ? void 0 : _a.getEntriesByMethod(methodName)) || [];
        }
    }

    /**
     * WordPress Internal Names → REST API Endpoint Mappings
     *
     * This file centralizes the mapping between WordPress internal names (used in queries)
     * and the corresponding REST API endpoint names.
     */
    /**
     * Map WordPress taxonomy names to REST API endpoint names
     *
     * WordPress uses internal taxonomy names in queries (like tax_query),
     * but the REST API endpoints use different names (usually plural).
     */
    const TAXONOMY_MAPPINGS = {
        // Core WordPress taxonomies
        'category': 'categories',
        'post_tag': 'tags',
        'nav_menu': 'nav-menus',
        'product_cat': 'terms/product_cat', // WooCommerce
        'product_tag': 'terms/product_tag',
        // Common plugin taxonomies (examples - uncomment and modify as needed)
        // 'product_cat': 'product-categories',      // WooCommerce
        // 'product_tag': 'product-tags',            // WooCommerce
        // 'product_type': 'product-types',          // WooCommerce
        // 'event_category': 'event-categories',     // Events plugins
        // 'portfolio_category': 'portfolio-categories', // Portfolio plugins
        // Add your custom taxonomies here:
        // 'my_taxonomy': 'my-taxonomy-endpoint',
    };
    /**
     * Map WordPress post type names to REST API endpoint names
     *
     * WordPress uses internal post type names in queries,
     * but the REST API endpoints may use different names.
     */
    const POST_TYPE_MAPPINGS = {
        // Core WordPress post types
        'post': 'posts',
        'page': 'pages',
        'attachment': 'media',
        'product': 'products',
        // Common plugin post types (examples - uncomment and modify as needed)
        // 'product': 'products',                    // WooCommerce
        // 'shop_order': 'orders',                   // WooCommerce
        // 'shop_coupon': 'coupons',                 // WooCommerce
        // 'event': 'events',                        // Events plugins
        // 'portfolio': 'portfolio',                 // Portfolio plugins
        // 'testimonial': 'testimonials',            // Testimonials plugins
        // 'faq': 'faqs',                           // FAQ plugins
        // Add your custom post types here:
        // 'my_post_type': 'my-post-type-endpoint',
    };
    /**
     * Map WordPress taxonomy name to REST API endpoint name
     * @param taxonomy - WordPress taxonomy name (e.g., 'nav_menu', 'category')
     * @returns REST API endpoint name (e.g., 'nav-menus', 'categories')
     */
    function mapTaxonomyToEndpoint(taxonomy) {
        return TAXONOMY_MAPPINGS[taxonomy] || taxonomy;
    }
    /**
     * Map WordPress post type name to REST API endpoint name
     * @param postType - WordPress post type name (e.g., 'post', 'page')
     * @returns REST API endpoint name (e.g., 'posts', 'pages')
     */
    function mapPostTypeToEndpoint(postType) {
        return POST_TYPE_MAPPINGS[postType] || "wvc_cpt_" + postType;
    }
    /**
     * Get all registered taxonomy mappings
     * @returns Object with all taxonomy mappings
     */
    function getAllTaxonomyMappings() {
        return { ...TAXONOMY_MAPPINGS };
    }
    /**
     * Get all registered post type mappings
     * @returns Object with all post type mappings
     */
    function getAllPostTypeMappings() {
        return { ...POST_TYPE_MAPPINGS };
    }
    /**
     * Register a new taxonomy mapping
     * @param taxonomy - WordPress taxonomy name
     * @param endpoint - REST API endpoint name
     */
    function registerTaxonomyMapping(taxonomy, endpoint) {
        TAXONOMY_MAPPINGS[taxonomy] = endpoint;
    }
    /**
     * Register a new post type mapping
     * @param postType - WordPress post type name
     * @param endpoint - REST API endpoint name
     */
    function registerPostTypeMapping(postType, endpoint) {
        POST_TYPE_MAPPINGS[postType] = endpoint;
    }
    /**
     * Check if a taxonomy mapping exists
     * @param taxonomy - WordPress taxonomy name
     * @returns True if mapping exists
     */
    function hasTaxonomyMapping(taxonomy) {
        return taxonomy in TAXONOMY_MAPPINGS;
    }
    /**
     * Check if a post type mapping exists
     * @param postType - WordPress post type name
     * @returns True if mapping exists
     */
    function hasPostTypeMapping(postType) {
        return postType in POST_TYPE_MAPPINGS;
    }

    /**
     * WordPress Posts API
     * Simplified to core functions that handle everything through parameters
     */
    class WPPostsAPI {
        constructor(client) {
            this.client = client;
        }
        /**
         * Get posts with WordPress-style query parameters
         * This is the main function that handles all post queries
         * @param params - WordPress query parameters (similar to WP_Query)
         * @returns Promise<WPResponse<WPPost[]>> - Includes posts data and response headers (e.g., x-wp-total, x-wp-totalpages)
         */
        async get_posts(params = {}) {
            const response = await this.client.get('posts', this.transformQueryParams(params));
            return response;
        }
        /**
         * Get pages with WordPress-style query parameters
         * @param params - WordPress query parameters (similar to WP_Query)
         * @returns Promise<WPResponse<WPPage[]>> - Includes pages data and response headers (e.g., x-wp-total, x-wp-totalpages)
         */
        async get_pages(params = {}) {
            const response = await this.client.get('pages', this.transformQueryParams(params));
            return response;
        }
        /**
         * Get items of a specific post type with WordPress-style query parameters
         * @param postType - Post type to query (e.g., 'product', 'event', etc.)
         * @param params - WordPress query parameters (similar to WP_Query)
         * @returns Promise<WPResponse<WPPost[] | WPPage[]>> - Includes items data and response headers (e.g., x-wp-total, x-wp-totalpages)
         */
        async get_items(postType, params = {}) {
            return this.getPostsByType(postType, params);
        }
        /**
         * Get a single post by ID
         * @param id - Post ID
         * @param params - Additional query parameters
         * @returns Promise<WPResponse<WPPost>>
         */
        async get_post(id, params = {}) {
            const response = await this.client.get(`posts/${id}`, params);
            return response;
        }
        /**
         * Get a single page by ID
         * @param id - Page ID
         * @param params - Additional query parameters
         * @returns Promise<WPResponse<WPPage>>
         */
        async get_page(id, params = {}) {
            const response = await this.client.get(`pages/${id}`, params);
            return response;
        }
        /**
         * Get a single item by ID and post type
         * @param id - Item ID
         * @param postType - Post type (e.g., 'post', 'page', 'product', etc.)
         * @param params - Additional query parameters
         * @returns Promise<WPResponse<WPPost | WPPage>>
         */
        async get_item(id, postType, params = {}) {
            const endpoint = mapPostTypeToEndpoint(postType);
            const response = await this.client.get(`${endpoint}/${id}`, params);
            return response;
        }
        /**
         * Transform advanced query parameters to WordPress REST API format
         * @param params - Advanced query parameters
         * @returns Transformed parameters for the API
         */
        transformQueryParams(params) {
            const apiParams = {};
            // Basic pagination and ordering
            if (params.page)
                apiParams.page = params.page;
            if (params.per_page)
                apiParams.per_page = params.per_page;
            if (params.orderby)
                apiParams.orderby = params.orderby;
            if (params.order)
                apiParams.order = params.order;
            if (params.offset)
                apiParams.offset = params.offset;
            // Post type and status
            if (params.post_type && params.post_type !== 'posts') ;
            if (params.post_status)
                apiParams.status = params.post_status;
            // Search and filtering
            if (params.search)
                apiParams.search = params.search;
            if (params.author) {
                apiParams.author = Array.isArray(params.author) ? params.author.join(',') : params.author;
            }
            if (params.author_exclude) {
                apiParams.author_exclude = Array.isArray(params.author_exclude)
                    ? params.author_exclude.join(',')
                    : params.author_exclude;
            }
            // Date filtering
            if (params.before)
                apiParams.before = params.before;
            if (params.after)
                apiParams.after = params.after;
            if (params.modified_before)
                apiParams.modified_before = params.modified_before;
            if (params.modified_after)
                apiParams.modified_after = params.modified_after;
            // Include/exclude specific posts
            if (params.include) {
                apiParams.include = Array.isArray(params.include) ? params.include.join(',') : params.include;
            }
            if (params.exclude) {
                apiParams.exclude = Array.isArray(params.exclude) ? params.exclude.join(',') : params.exclude;
            }
            // Slug filtering
            if (params.slug) {
                apiParams.slug = Array.isArray(params.slug) ? params.slug.join(',') : params.slug;
            }
            // Parent filtering (for hierarchical post types)
            if (params.parent) {
                apiParams.parent = Array.isArray(params.parent) ? params.parent.join(',') : params.parent;
            }
            if (params.parent_exclude) {
                apiParams.parent_exclude = Array.isArray(params.parent_exclude)
                    ? params.parent_exclude.join(',')
                    : params.parent_exclude;
            }
            // Taxonomy queries
            if (params.categories) {
                apiParams.categories = Array.isArray(params.categories) ? params.categories.join(',') : params.categories;
            }
            if (params.categories_exclude) {
                apiParams.categories_exclude = Array.isArray(params.categories_exclude)
                    ? params.categories_exclude.join(',')
                    : params.categories_exclude;
            }
            if (params.tags) {
                apiParams.tags = Array.isArray(params.tags) ? params.tags.join(',') : params.tags;
            }
            if (params.tags_exclude) {
                apiParams.tags_exclude = Array.isArray(params.tags_exclude)
                    ? params.tags_exclude.join(',')
                    : params.tags_exclude;
            }
            // Advanced taxonomy query
            if (params.tax_query && params.tax_query.length > 0) {
                params.tax_query.forEach((taxQuery) => {
                    if (!taxQuery.taxonomy || !taxQuery.terms)
                        return;
                    const terms = Array.isArray(taxQuery.terms) ? taxQuery.terms.join(',') : taxQuery.terms;
                    if (taxQuery.operator === 'NOT IN') {
                        apiParams[`${taxQuery.taxonomy}_exclude`] = terms;
                    }
                    else {
                        apiParams[taxQuery.taxonomy] = terms;
                    }
                });
            }
            // Meta queries - simplified approach
            if (params.meta_key)
                apiParams.meta_key = params.meta_key;
            if (params.meta_value)
                apiParams.meta_value = params.meta_value;
            if (params.meta_compare)
                apiParams.meta_compare = params.meta_compare;
            if (params.meta_type)
                apiParams.meta_type = params.meta_type;
            // Advanced meta query - convert to simple meta_key/meta_value where possible
            if (params.meta_query && params.meta_query.length > 0) {
                const firstMetaQuery = params.meta_query[0];
                if (firstMetaQuery.key && firstMetaQuery.value) {
                    apiParams.meta_key = firstMetaQuery.key;
                    apiParams.meta_value = firstMetaQuery.value;
                    if (firstMetaQuery.compare)
                        apiParams.meta_compare = firstMetaQuery.compare;
                    if (firstMetaQuery.type)
                        apiParams.meta_type = firstMetaQuery.type;
                }
            }
            // Sticky posts
            if (params.sticky !== undefined)
                apiParams.sticky = params.sticky;
            // Context and REST controls
            if (params.context)
                apiParams.context = params.context;
            if (params._fields)
                apiParams._fields = params._fields.join(',');
            if (params._embed !== undefined) {
                apiParams._embed = Array.isArray(params._embed) ? params._embed.join(',') : params._embed;
            }
            if (params._envelope !== undefined)
                apiParams._envelope = params._envelope;
            if (params._method)
                apiParams._method = params._method;
            if (params._jsonp)
                apiParams._jsonp = params._jsonp;
            // Preserve any custom parameters (e.g., product_cat/product_tag or arbitrary taxonomies)
            const handledKeys = new Set([
                'page',
                'per_page',
                'orderby',
                'order',
                'offset',
                'post_type',
                'post_status',
                'status',
                'search',
                'author',
                'author_exclude',
                'before',
                'after',
                'modified_before',
                'modified_after',
                'include',
                'exclude',
                'slug',
                'parent',
                'parent_exclude',
                'categories',
                'categories_exclude',
                'tags',
                'tags_exclude',
                'tax_query',
                'meta_key',
                'meta_value',
                'meta_compare',
                'meta_type',
                'meta_query',
                'sticky',
                'context',
                '_fields',
                '_embed',
                '_envelope',
                '_method',
                '_jsonp',
            ]);
            Object.entries(params).forEach(([key, value]) => {
                if (value === undefined || value === null)
                    return;
                if (handledKeys.has(key))
                    return;
                apiParams[key] = Array.isArray(value) ? value.join(',') : value;
            });
            return apiParams;
        }
        /**
         * Helper method to handle different post types
         * @param postType - Post type to query
         * @param params - Query parameters
         * @returns Promise<WPResponse<WPPost[]>>
         */
        async getPostsByType(postType, params = {}) {
            // Map WordPress post type to REST API endpoint
            const endpoint = mapPostTypeToEndpoint(postType);
            if (postType === 'post') {
                return this.get_posts(params);
            }
            else {
                // Try custom post type endpoint first using custom namespace, fallback to posts with type filter
                try {
                    const response = await this.client.getWithNamespace(endpoint, this.transformQueryParams(params), 'wvc/v1');
                    return response;
                }
                catch (error) {
                    // Fallback: add post_type to the posts endpoint
                    const paramsWithType = { ...params, post_type: postType };
                    const response = await this.client.get('posts', this.transformQueryParams(paramsWithType));
                    return response;
                }
            }
        }
    }

    /**
     * WordPress Taxonomies API
     * Simplified to core functions that handle everything through parameters
     */
    class WPTaxonomiesAPI {
        constructor(client) {
            this.client = client;
        }
        /**
         * Get terms with WordPress-style query parameters
         * This is the main function that handles all term queries
         * @param params - WordPress taxonomy query parameters
         * @returns Promise<WPResponse<WPTerm[]>> - Includes terms data and response headers
         */
        async get_terms(params = {}) {
            const endpoint = mapTaxonomyToEndpoint(params.taxonomy || 'category');
            const response = await this.client.getWithNamespace(endpoint, this.transformQueryParams(params), 'wvc/v1');
            return {
                data: response.data,
                headers: response.headers,
                status: response.status
            };
        }
        /**
         * Get taxonomies
         * @param params - Query parameters
         * @returns Promise<WPResponse<WPTaxonomy[]>> - Includes taxonomies data and response headers
         */
        async get_taxonomies(params = {}) {
            const response = await this.client.get('taxonomies', params);
            return response;
        }
        /**
         * Transform taxonomy query parameters to WordPress REST API format
         * @param params - Taxonomy query parameters
         * @returns Transformed parameters for the API
         */
        transformQueryParams(params) {
            const apiParams = {};
            // Basic pagination and ordering
            if (params.page)
                apiParams.page = params.page;
            if (params.per_page)
                apiParams.per_page = params.per_page;
            if (params.orderby)
                apiParams.orderby = params.orderby;
            if (params.order)
                apiParams.order = params.order;
            if (params.offset)
                apiParams.offset = params.offset;
            // Search and filtering
            if (params.search)
                apiParams.search = params.search;
            if (params.name)
                apiParams.name = params.name;
            if (params.slug) {
                if (Array.isArray(params.slug)) {
                    apiParams.slug = params.slug.join(',');
                }
                else {
                    apiParams.slug = params.slug;
                }
            }
            // Include/exclude specific terms
            if (params.include) {
                if (Array.isArray(params.include)) {
                    apiParams.include = params.include.join(',');
                }
                else {
                    apiParams.include = params.include;
                }
            }
            if (params.exclude) {
                if (Array.isArray(params.exclude)) {
                    apiParams.exclude = params.exclude.join(',');
                }
                else {
                    apiParams.exclude = params.exclude;
                }
            }
            // Hierarchical filtering
            if (params.parent !== undefined)
                apiParams.parent = params.parent;
            if (params.child_of)
                apiParams.child_of = params.child_of;
            // Taxonomy-specific parameters
            if (params.hide_empty !== undefined)
                apiParams.hide_empty = params.hide_empty;
            if (params.post)
                apiParams.post = params.post;
            if (params.count !== undefined)
                apiParams.count = params.count;
            if (params.fields)
                apiParams.fields = params.fields;
            if (params.get)
                apiParams.get = params.get;
            // Context and fields
            if (params.context)
                apiParams.context = params.context;
            if (params._fields) {
                apiParams._fields = Array.isArray(params._fields)
                    ? params._fields.join(",")
                    : params._fields;
            }
            if (params._embed !== undefined) {
                apiParams._embed = Array.isArray(params._embed)
                    ? params._embed.join(",")
                    : params._embed;
            }
            // Remove taxonomy from params as it's used for endpoint
            const { taxonomy, ...restParams } = params;
            // Add any additional custom parameters
            Object.keys(restParams).forEach(key => {
                if (!apiParams.hasOwnProperty(key) && restParams[key] !== undefined) {
                    apiParams[key] = restParams[key];
                }
            });
            return apiParams;
        }
    }

    /**
     * WordPress Meta API
     * Simplified to core functions that handle everything through parameters
     */
    class WPMetaAPI {
        constructor(client) {
            this.client = client;
        }
        /**
         * Get meta data with WordPress-style query parameters
         * This is the main function that handles all meta queries
         * @param params - WordPress meta query parameters
         * @returns Promise<WPResponse<any[]>> - Includes meta data and response headers
         */
        async get_meta(params = {}) {
            const endpoint = this.buildEndpoint(params);
            const response = await this.client.get(endpoint, this.transformQueryParams(params));
            return response;
        }
        /**
         * Create new meta data
         * @param objectType - Object type (post, page, term, user, comment)
         * @param objectId - Object ID
         * @param metaData - Meta data to create
         * @returns Promise<WPResponse<any>> - Includes created meta data and response headers
         */
        async create_meta(objectType, objectId, metaData) {
            const endpoint = `${objectType}s/${objectId}/meta`;
            const response = await this.client.post(endpoint, metaData);
            return response;
        }
        /**
         * Update existing meta data
         * @param objectType - Object type (post, page, term, user, comment)
         * @param objectId - Object ID
         * @param metaId - Meta ID
         * @param metaData - Meta data to update
         * @returns Promise<WPResponse<any>> - Includes updated meta data and response headers
         */
        async update_meta(objectType, objectId, metaId, metaData) {
            const endpoint = `${objectType}s/${objectId}/meta/${metaId}`;
            const response = await this.client.put(endpoint, metaData);
            return response;
        }
        /**
         * Delete meta data
         * @param objectType - Object type (post, page, term, user, comment)
         * @param objectId - Object ID
         * @param metaId - Meta ID
         * @param force - Whether to force delete
         * @returns Promise<WPResponse<any>> - Includes deletion result and response headers
         */
        async delete_meta(objectType, objectId, metaId, force = false) {
            const endpoint = `${objectType}s/${objectId}/meta/${metaId}`;
            const response = await this.client.delete(endpoint, { force });
            return response;
        }
        /**
         * Build the appropriate endpoint based on parameters
         * @param params - Meta query parameters
         * @returns Endpoint string
         */
        buildEndpoint(params) {
            const objectType = params.object_type || 'post';
            const objectId = params.object_id;
            if (objectId) {
                return `${objectType}s/${objectId}/meta`;
            }
            else {
                // Generic meta endpoint (if supported)
                return `${objectType}s/meta`;
            }
        }
        /**
         * Transform meta query parameters to WordPress REST API format
         * @param params - Meta query parameters
         * @returns Transformed parameters for the API
         */
        transformQueryParams(params) {
            const apiParams = {};
            // Basic pagination and ordering
            if (params.page)
                apiParams.page = params.page;
            if (params.per_page)
                apiParams.per_page = params.per_page;
            if (params.orderby)
                apiParams.orderby = params.orderby;
            if (params.order)
                apiParams.order = params.order;
            if (params.offset)
                apiParams.offset = params.offset;
            // Search and filtering
            if (params.search)
                apiParams.search = params.search;
            if (params.key)
                apiParams.key = params.key;
            if (params.value !== undefined)
                apiParams.value = params.value;
            if (params.compare)
                apiParams.compare = params.compare;
            if (params.type)
                apiParams.type = params.type;
            // Include/exclude specific meta
            if (params.include) {
                if (Array.isArray(params.include)) {
                    apiParams.include = params.include.join(',');
                }
                else {
                    apiParams.include = params.include;
                }
            }
            if (params.exclude) {
                if (Array.isArray(params.exclude)) {
                    apiParams.exclude = params.exclude.join(',');
                }
                else {
                    apiParams.exclude = params.exclude;
                }
            }
            // Context and fields
            if (params.context)
                apiParams.context = params.context;
            if (params._fields)
                apiParams._fields = params._fields;
            if (params._embed !== undefined)
                apiParams._embed = params._embed;
            // Remove object-specific params as they're used for endpoint
            const { object_type, object_id, ...restParams } = params;
            // Add any additional custom parameters
            Object.keys(restParams).forEach(key => {
                if (!apiParams.hasOwnProperty(key) && restParams[key] !== undefined) {
                    apiParams[key] = restParams[key];
                }
            });
            return apiParams;
        }
    }

    /**
     * WordPress Menus API
     * Uses dedicated REST endpoints (/wvc/v1/menus) when available, falls back to posts and taxonomies APIs
     */
    class WPMenusAPI {
        constructor(client) {
            this.client = client;
            this.posts = new WPPostsAPI(client);
            this.taxonomies = new WPTaxonomiesAPI(client);
        }
        /**
         * Transform a WordPress term (nav_menu) to WPMenu format
         * @param term - WordPress term from nav_menu taxonomy
         * @returns WPMenu object
         */
        transformTermToMenu(term) {
            return {
                id: term.id,
                name: term.name,
                slug: term.slug,
                description: term.description,
                count: term.count,
                items: [] // Will be populated separately
            };
        }
        /**
         * Transform a WordPress post (nav_menu_item) to WPMenuItem format
         * @param post - WordPress post of type nav_menu_item
         * @returns WPMenuItem object
         */
        transformPostToMenuItem(post) {
            var _a, _b;
            const meta = post.meta || {};
            return {
                id: post.id,
                title: ((_a = post.title) === null || _a === void 0 ? void 0 : _a.rendered) || '',
                url: meta._menu_item_url || post.link || '',
                target: meta._menu_item_target || '',
                description: ((_b = post.content) === null || _b === void 0 ? void 0 : _b.rendered) || '',
                classes: meta._menu_item_classes ? meta._menu_item_classes.split(' ') : [],
                menu_order: post.menu_order || 0,
                parent: parseInt(meta._menu_item_menu_item_parent) || 0,
                object_id: parseInt(meta._menu_item_object_id) || 0,
                object: meta._menu_item_object || '',
                type: meta._menu_item_type || '',
            };
        }
        /**
         * Get menus with WordPress-style query parameters
         * Uses the new /menus REST endpoint when available, falls back to taxonomies API
         * @param params - WordPress query parameters
         * @returns Promise<WPResponse<WPMenu[]>> - Includes menus data and response headers
         */
        async get_menus(params = {}) {
            try {
                // Try the new REST endpoint first with wvc/v1 namespace
                const response = await this.client.getWithNamespace('menus', params, 'wvc/v1');
                const menus = response.data.map((menu) => ({
                    id: menu.id,
                    name: menu.name,
                    slug: menu.slug,
                    description: menu.description || '',
                    count: menu.count || 0,
                    items: menu.items || []
                }));
                return {
                    data: menus,
                    headers: response.headers,
                    status: response.status
                };
            }
            catch (error) {
                // Fallback to taxonomies API for backward compatibility
                const termsResponse = await this.taxonomies.get_terms({
                    ...params,
                    taxonomy: 'nav_menu'
                });
                const menus = termsResponse.data.map(term => this.transformTermToMenu(term));
                return {
                    data: menus,
                    headers: termsResponse.headers,
                    status: termsResponse.status
                };
            }
        }
        /**
         * Get a single menu with its items using the new REST endpoint
         * Corresponds to /menus/(?P<id>\d+) endpoint
         * @param menuId - Menu ID (required)
         * @returns Promise<WPResponse<WPMenu>> - Includes menu data and response headers
         */
        async get_menu(menuId) {
            if (!menuId) {
                throw new Error("menuId is required");
            }
            try {
                // Use the new REST endpoint with wvc/v1 namespace
                const response = await this.client.getWithNamespace(`menus/${menuId}`, {}, 'wvc/v1');
                const menu = response.data;
                const menuData = {
                    id: menu.id,
                    name: menu.name,
                    slug: menu.slug,
                    description: menu.description || '',
                    count: menu.count || 0,
                    items: menu.items || []
                };
                return {
                    data: menuData,
                    headers: response.headers,
                    status: response.status
                };
            }
            catch (error) {
                // Fallback: get menu info using taxonomies API
                const menuTermsResponse = await this.taxonomies.get_terms({
                    taxonomy: 'nav_menu',
                    include: [menuId]
                });
                if (menuTermsResponse.data.length === 0) {
                    throw new Error(`Menu with ID ${menuId} not found`);
                }
                const menu = this.transformTermToMenu(menuTermsResponse.data[0]);
                // Get items using posts API as fallback
                const postsResponse = await this.posts.get_posts({
                    post_type: 'nav_menu_item',
                    meta_query: [{
                            key: '_menu_item_menu_item_parent',
                            value: menuId.toString(),
                            compare: '='
                        }],
                    per_page: 100
                });
                menu.items = postsResponse.data.map(post => this.transformPostToMenuItem(post));
                return {
                    data: menu,
                    headers: postsResponse.headers,
                    status: postsResponse.status
                };
            }
        }
        /**
         * Get menu items for a specific menu using the new REST API structure
         * @param menuId - Menu ID (required)
         * @returns Promise<WPResponse<WPMenuItem[]>> - Includes menu items data and response headers
         */
        async get_menu_items(menuId) {
            if (!menuId) {
                throw new Error("menuId is required");
            }
            try {
                // Get the menu with items using the /menus/{id} endpoint
                // The menu response includes the items array
                const response = await this.client.getWithNamespace(`menus/${menuId}`, {}, 'wvc/v1');
                const menu = response.data;
                // Helper function to recursively process menu items and their children
                const processMenuItem = (item) => {
                    const processedItem = {
                        id: item.id,
                        title: item.title || '',
                        url: item.url || '',
                        target: item.target || '',
                        description: item.description || '',
                        classes: item.classes || [],
                        menu_order: item.order || item.menu_order || 0,
                        parent: item.parent || 0,
                        object_id: item.object_id || 0,
                        object: item.object_type || item.object || '',
                        type: item.type || item.object_type || 'custom',
                        resolved_url: item.resolved_url || item.url || '',
                        children: [],
                        _menu_item_type: item.type || item.object_type || 'custom',
                        _menu_item_object_id: parseInt(item.object_id) || 0,
                    };
                    // Process children recursively
                    if (item.children && Array.isArray(item.children)) {
                        processedItem.children = item.children.map(processMenuItem);
                    }
                    return processedItem;
                };
                // Return the items from the menu response
                const items = (menu.items || []).map(processMenuItem);
                return {
                    data: items,
                    headers: response.headers,
                    status: response.status
                };
            }
            catch (error) {
                // Fallback to posts API for backward compatibility
                return {
                    data: [],
                    headers: {},
                    status: 200
                };
            }
        }
    }

    /**
     * WooCommerce Storefront API (wc/store/v1) helpers and mappings.
     * Used to route product post type and product taxonomy queries to the Store API
     * instead of wp/v2 or wvc/v1.
     */
    /** Store API namespace for products and term endpoints */
    const STORE_API_NAMESPACE = "wc/store/v1";
    /**
     * Taxonomy → Store API term endpoint path (under wc/store/v1).
     * Used by rest_wp_term_query to route product taxonomies to Store API.
     */
    const STORE_TERM_ENDPOINTS = {
        "product_cat": "products/categories",
        "product_tag": "products/tags",
        "product_attribute": "products/attributes",
        "attribute": "products/attributes",
        "brand": "products/brands",
        "product_brand": "products/brands",
    };
    /** Params used only for routing; must not be sent to the Store API (products) */
    const STORE_ROUTING_PARAMS = ["postType"];
    /** WP term-query params not used by Store API term endpoints; strip when calling Store API */
    const STORE_TERM_STRIP_PARAMS = ["fields", "pad_counts", "hierarchical", "childless"];
    /**
     * Consumer field name → Store API term field(s) needed to fulfill it.
     * Store API terms use "permalink" (not "link"); image is an object with src, thumbnail, etc.
     */
    const CONSUMER_TO_STORE_TERM_FIELDS = {
        "id": ["id"],
        "name": ["name"],
        "slug": ["slug"],
        "title": ["name"],
        "title/rendered": ["name"],
        "title.rendered": ["name"],
        "image_url": ["image"],
        "featured_image_url": ["image"],
        "link": ["permalink"],
        "permalink": ["permalink"],
        "description": ["description"],
        "count": ["count"],
        "parent": ["parent"],
        "image": ["image"],
        "review_count": ["review_count"],
    };
    /**
     * Converts consumer-requested term field names to Store API _fields list (deduplicated).
     */
    function mapConsumerFieldsToStoreApiTermFields(fields) {
        const set = new Set();
        for (const f of fields) {
            const storeFields = CONSUMER_TO_STORE_TERM_FIELDS[f];
            if (storeFields) {
                storeFields.forEach((s) => set.add(s));
            }
            else {
                set.add(f);
            }
        }
        return Array.from(set);
    }
    /**
     * Consumer field name → Store API field(s) needed to fulfill it.
     * Used to convert requested fields (e.g. title, price) to Store API _fields (name, prices).
     */
    const CONSUMER_TO_STORE_PRODUCT_FIELDS = {
        "id": ["id"],
        "name": ["name"],
        "slug": ["slug"],
        "title": ["name"],
        "title/rendered": ["name"],
        "title.rendered": ["name"],
        "link": ["permalink"],
        "permalink": ["permalink"],
        "price": ["prices"],
        "discounted_price": ["prices"],
        "sale_price": ["prices"],
        "regular_price": ["prices"],
        "featured_image_url": ["images"],
        "image_url": ["images"],
        "images": ["images"],
        "categories": ["categories"],
        "tags": ["tags"],
        "brands": ["brands"],
        "attributes": ["attributes"],
        "type": ["type"],
        "variation": ["variation"],
        "sku": ["sku"],
        "on_sale": ["on_sale"],
        "average_rating": ["average_rating"],
        "review_count": ["review_count"],
        "short_description": ["short_description"],
        "description": ["description"],
        "price_html": ["price_html"],
        "parent": ["parent"],
        "add_to_cart": ["add_to_cart"],
        "stock_availability": ["stock_availability"],
        "is_in_stock": ["is_in_stock"],
        "is_on_backorder": ["is_on_backorder"],
        "low_stock_remaining": ["low_stock_remaining"],
        "sold_individually": ["sold_individually"],
        "has_options": ["has_options"],
        "is_purchasable": ["is_purchasable"],
        "variations": ["variations"],
        "grouped_products": ["grouped_products"],
        "extensions": ["extensions"],
    };
    /**
     * Converts consumer-requested field names to Store API _fields list (deduplicated).
     * Known consumer names (e.g. title, price) are mapped to Store API names; custom field
     * names are preserved and sent through as-is so the Store API can return them.
     */
    function mapConsumerFieldsToStoreApiProductFields(fields) {
        const set = new Set();
        for (const f of fields) {
            const storeFields = CONSUMER_TO_STORE_PRODUCT_FIELDS[f];
            if (storeFields) {
                storeFields.forEach((s) => set.add(s));
            }
            else {
                set.add(f);
            }
        }
        return Array.from(set);
    }
    /**
     * Sets a value at a slash-separated path (e.g. "title/rendered" → out.title.rendered = value).
     */
    function setNested(out, path, value) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length === 0)
            return;
        let current = out;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
                current[part] = {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }
    /**
     * Gets a value at a slash-separated path (e.g. "title/rendered" → obj.title?.rendered).
     */
    function getNested(obj, path) {
        const parts = path.split("/").filter(Boolean);
        let current = obj;
        for (const part of parts) {
            if (current == null || typeof current !== "object")
                return undefined;
            current = current[part];
        }
        return current;
    }
    /**
     * Converts a raw Store API price string (integer in minor units, e.g. "2499")
     * to a human-readable decimal string (e.g. "24.99") using currency_minor_unit
     * and currency_decimal_separator from the prices object.
     */
    function formatStoreApiPrice(rawPrice, minorUnit, decimalSeparator) {
        if (rawPrice === undefined || rawPrice === null || rawPrice === "")
            return undefined;
        const str = String(rawPrice);
        if (minorUnit <= 0)
            return str;
        const padded = str.padStart(minorUnit + 1, "0");
        const intPart = padded.slice(0, padded.length - minorUnit);
        const fracPart = padded.slice(padded.length - minorUnit);
        return intPart + decimalSeparator + fracPart;
    }
    /**
     * Extracts currency_minor_unit and currency_decimal_separator from the Store API prices object.
     */
    function getPriceFormatInfo(prices) {
        const minorUnit = typeof prices["currency_minor_unit"] === "number"
            ? prices["currency_minor_unit"]
            : Number(prices["currency_minor_unit"]) || 0;
        const decimalSeparator = typeof prices["currency_decimal_separator"] === "string"
            ? prices["currency_decimal_separator"]
            : ".";
        return { minorUnit, decimalSeparator };
    }
    /**
     * Flattens Store API prices object into top-level keys on out.
     * Price values (price, regular_price, sale_price) are converted from minor-unit
     * integers to proper decimal strings using currency_minor_unit and currency_decimal_separator.
     */
    function flattenPrices(prices, out) {
        var _a;
        if (!prices || typeof prices !== "object")
            return;
        const { minorUnit, decimalSeparator } = getPriceFormatInfo(prices);
        const priceKeys = ["price", "regular_price", "sale_price"];
        const metaKeys = [
            "currency_code",
            "currency_symbol",
            "currency_minor_unit",
            "currency_decimal_separator",
            "currency_thousand_separator",
            "currency_prefix",
            "currency_suffix",
            "price_range",
        ];
        for (const k of priceKeys) {
            if (prices[k] !== undefined && prices[k] !== null) {
                out[k] = (_a = formatStoreApiPrice(prices[k], minorUnit, decimalSeparator)) !== null && _a !== void 0 ? _a : prices[k];
            }
        }
        for (const k of metaKeys) {
            if (prices[k] !== undefined && prices[k] !== null) {
                out[k] = prices[k];
            }
        }
    }
    /**
     * Resolves the main product image URL from Store API item (single featured image).
     * Checks: item.featured_image_url, item.featured_image (object), item.image, then images[0].src or images[0].url.
     */
    function getFeaturedImageUrl(item) {
        const asString = (v) => typeof v === "string" && v.length > 0;
        if (asString(item["featured_image_url"]))
            return item["featured_image_url"];
        const feat = item["featured_image"];
        if (feat && typeof feat === "object") {
            const o = feat;
            if (asString(o["src"]))
                return o["src"];
            if (asString(o["url"]))
                return o["url"];
        }
        if (asString(item["image"]))
            return item["image"];
        const images = item["images"];
        if (!Array.isArray(images) || images.length === 0)
            return undefined;
        const first = images[0];
        if (first && typeof first === "object") {
            const img = first;
            if (asString(img["src"]))
                return img["src"];
            if (asString(img["url"]))
                return img["url"];
        }
        return undefined;
    }
    /**
     * Transforms a single Store API product item into the requested consumer format.
     * - Maps name → title (object with rendered), title/rendered (nested), prices → flat, main image → featured_image_url, permalink → link.
     * - Subprops use slash notation (e.g. "title/rendered" → title: { rendered: value }).
     * - Custom requested fields are preserved: from item top-level or item.extensions.
     */
    function transformStoreApiProductItem(item, requestedFields) {
        var _a, _b, _c, _d, _e, _f, _g;
        const out = {};
        const prices = item["prices"];
        const featuredImageUrl = getFeaturedImageUrl(item);
        const { minorUnit, decimalSeparator } = prices
            ? getPriceFormatInfo(prices)
            : { minorUnit: 0, decimalSeparator: "." };
        for (const key of requestedFields) {
            switch (key) {
                case "title":
                    if (item["name"] !== undefined)
                        out["title"] = { rendered: item["name"] };
                    break;
                case "title/rendered":
                case "title.rendered":
                    if (item["name"] !== undefined)
                        setNested(out, "title/rendered", item["name"]);
                    break;
                case "link":
                    if (item["permalink"] !== undefined)
                        out[key] = item["permalink"];
                    break;
                case "price":
                    if (prices && "price" in prices)
                        out[key] = (_a = formatStoreApiPrice(prices["price"], minorUnit, decimalSeparator)) !== null && _a !== void 0 ? _a : prices["price"];
                    break;
                case "discounted_price":
                    if (prices) {
                        const raw = (_b = prices["sale_price"]) !== null && _b !== void 0 ? _b : prices["price"];
                        out[key] = (_d = (_c = formatStoreApiPrice(raw, minorUnit, decimalSeparator)) !== null && _c !== void 0 ? _c : raw) !== null && _d !== void 0 ? _d : undefined;
                    }
                    break;
                case "sale_price":
                    if (prices && "sale_price" in prices)
                        out[key] = (_e = formatStoreApiPrice(prices["sale_price"], minorUnit, decimalSeparator)) !== null && _e !== void 0 ? _e : prices["sale_price"];
                    break;
                case "regular_price":
                    if (prices && "regular_price" in prices)
                        out[key] = (_f = formatStoreApiPrice(prices["regular_price"], minorUnit, decimalSeparator)) !== null && _f !== void 0 ? _f : prices["regular_price"];
                    break;
                case "featured_image_url":
                case "image_url":
                    if (featuredImageUrl !== undefined)
                        out[key] = featuredImageUrl;
                    break;
                case "prices":
                    flattenPrices(prices !== null && prices !== void 0 ? prices : undefined, out);
                    break;
                default:
                    if (key.includes("/")) {
                        const value = (_g = getNested(item, key)) !== null && _g !== void 0 ? _g : (item["extensions"] && typeof item["extensions"] === "object"
                            ? getNested(item["extensions"], key)
                            : undefined);
                        if (value !== undefined)
                            setNested(out, key, value);
                    }
                    else if (Object.prototype.hasOwnProperty.call(item, key)) {
                        out[key] = item[key];
                    }
                    else {
                        const ext = item["extensions"];
                        if (ext && typeof ext === "object" && Object.prototype.hasOwnProperty.call(ext, key)) {
                            out[key] = ext[key];
                        }
                    }
                    break;
            }
        }
        return out;
    }
    /**
     * Transforms Store API products response to consumer-requested field format (flat, name→title, etc.).
     */
    function transformStoreApiProductsResponse(response, requestedFields) {
        if (!requestedFields || requestedFields.length === 0) {
            return response;
        }
        if (!Array.isArray(response.data)) {
            return response;
        }
        const data = response.data.map((item) => transformStoreApiProductItem(item, requestedFields));
        return {
            ...response,
            data,
        };
    }
    /**
     * Taxonomy slug (WP/query param name) → Store API products param name.
     * Store API uses short names: category, tag, brand. Requests may use taxonomy slugs (product_cat, product_tag, product_brand).
     */
    const STORE_PRODUCT_TAX_PARAM = {
        "product_cat": "category",
        "product_tag": "tag",
        "product_brand": "brand",
    };
    /**
     * Maps product query params to WooCommerce Store API format (REST-style or plain params).
     * - Store API uses "category", "tag", "brand" (short names). Taxonomy slugs (product_cat, product_tag, product_brand) are mapped to these.
     * - Plural forms (categories, tags) are also mapped to category/tag when the short param is not already set.
     * - Strips only routing-only params (e.g. postType). All other custom params are preserved.
     * - _fields: known names are mapped to Store API names; custom field names are preserved.
     * - _embed: all values preserved (normalized to comma-separated string if array).
     */
    function mapRestParamsToStoreApiProducts(params) {
        const out = {};
        for (const [key, value] of Object.entries(params)) {
            if (STORE_ROUTING_PARAMS.includes(key) || value === undefined || value === null) {
                continue;
            }
            out[key] = value;
        }
        // Map taxonomy slug params to Store API param names (product_cat → category, product_tag → tag, product_brand → brand)
        for (const [taxParam, storeParam] of Object.entries(STORE_PRODUCT_TAX_PARAM)) {
            if (out[taxParam] !== undefined) {
                out[storeParam] = out[taxParam];
                if (taxParam !== storeParam)
                    delete out[taxParam];
            }
            const excludeKey = `${taxParam}_exclude`;
            const storeExcludeKey = `${storeParam}_exclude`;
            if (out[excludeKey] !== undefined) {
                out[storeExcludeKey] = out[excludeKey];
                if (excludeKey !== storeExcludeKey)
                    delete out[excludeKey];
            }
        }
        if (out["categories"] !== undefined) {
            out["category"] = out["categories"];
            delete out["categories"];
        }
        if (out["categories_exclude"] !== undefined) {
            out["category_exclude"] = out["categories_exclude"];
            delete out["categories_exclude"];
        }
        if (out["tags"] !== undefined) {
            out["tag"] = out["tags"];
            delete out["tags"];
        }
        if (out["tags_exclude"] !== undefined) {
            out["tag_exclude"] = out["tags_exclude"];
            delete out["tags_exclude"];
        }
        if (out["_fields"] !== undefined) {
            const raw = out["_fields"];
            const arr = Array.isArray(raw)
                ? raw.map(String)
                : typeof raw === "string"
                    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
            if (arr.length > 0) {
                out["_fields"] = mapConsumerFieldsToStoreApiProductFields(arr).join(",");
            }
        }
        if (out["_embed"] !== undefined) {
            const rawEmbed = out["_embed"];
            if (Array.isArray(rawEmbed) && rawEmbed.length > 0) {
                out["_embed"] = rawEmbed.map(String).join(",");
            }
        }
        return out;
    }
    /**
     * Resolves the term image URL from Store API term item.
     * Checks: item.image_url, item.image (object with src/url), item.image.src, item.image.url.
     */
    function getTermImageUrl(item) {
        const asString = (v) => typeof v === "string" && v.length > 0;
        if (asString(item["image_url"]))
            return item["image_url"];
        const img = item["image"];
        if (img && typeof img === "object") {
            const o = img;
            if (asString(o["src"]))
                return o["src"];
            if (asString(o["url"]))
                return o["url"];
        }
        return undefined;
    }
    /**
     * Transforms a single Store API term item into the requested consumer format.
     * - Maps name → title, title/rendered; image → image_url; link/permalink → link.
     * - Subprops use slash notation (e.g. "title/rendered" → title: { rendered: value }).
     */
    function transformStoreApiTermItem(item, requestedFields) {
        var _a;
        const out = {};
        const imageUrl = getTermImageUrl(item);
        for (const key of requestedFields) {
            switch (key) {
                case "title":
                    if (item["name"] !== undefined)
                        out["title"] = { rendered: item["name"] };
                    break;
                case "title/rendered":
                case "title.rendered":
                    if (item["name"] !== undefined)
                        setNested(out, "title/rendered", item["name"]);
                    break;
                case "link":
                    if (item["permalink"] !== undefined)
                        out["link"] = item["permalink"];
                    else if (item["link"] !== undefined)
                        out["link"] = item["link"];
                    break;
                case "permalink":
                    if (item["permalink"] !== undefined)
                        out["permalink"] = item["permalink"];
                    else if (item["link"] !== undefined)
                        out["permalink"] = item["link"];
                    break;
                case "image_url":
                case "featured_image_url":
                    if (imageUrl !== undefined)
                        out[key] = imageUrl;
                    break;
                default:
                    if (key.includes("/")) {
                        const value = (_a = getNested(item, key)) !== null && _a !== void 0 ? _a : (item["extensions"] && typeof item["extensions"] === "object"
                            ? getNested(item["extensions"], key)
                            : undefined);
                        if (value !== undefined)
                            setNested(out, key, value);
                    }
                    else if (Object.prototype.hasOwnProperty.call(item, key)) {
                        out[key] = item[key];
                    }
                    break;
            }
        }
        return out;
    }
    /**
     * Transforms Store API terms response to consumer-requested field format.
     */
    function transformStoreApiTermsResponse(response, requestedFields) {
        if (!requestedFields || requestedFields.length === 0) {
            return response;
        }
        if (!Array.isArray(response.data)) {
            return response;
        }
        const data = response.data.map((item) => transformStoreApiTermItem(item, requestedFields));
        return {
            ...response,
            data,
        };
    }
    /**
     * Maps REST params for Store API term endpoints (e.g. products/categories, products/tags).
     * - Strips only WP term-query-only params (fields, pad_counts, hierarchical, childless). All other custom params are preserved.
     * - _fields: known names are mapped to Store API names; custom field names are preserved.
     * - _embed: all values preserved (normalized to comma-separated string if array).
     */
    function mapRestParamsToStoreApiTerms(params) {
        const out = {};
        for (const [key, value] of Object.entries(params)) {
            if (STORE_TERM_STRIP_PARAMS.includes(key) ||
                value === undefined ||
                value === null) {
                continue;
            }
            out[key] = value;
        }
        if (out["_fields"] !== undefined) {
            const raw = out["_fields"];
            const arr = Array.isArray(raw)
                ? raw.map(String)
                : typeof raw === "string"
                    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
            if (arr.length > 0) {
                out["_fields"] = mapConsumerFieldsToStoreApiTermFields(arr).join(",");
            }
        }
        if (out["_embed"] !== undefined) {
            const rawEmbed = out["_embed"];
            if (Array.isArray(rawEmbed) && rawEmbed.length > 0) {
                out["_embed"] = rawEmbed.map(String).join(",");
            }
        }
        return out;
    }
    /**
     * Returns the Store API term endpoint for a taxonomy, or undefined if not a Store API taxonomy.
     */
    function getStoreTermEndpoint(taxonomy) {
        return STORE_TERM_ENDPOINTS[taxonomy];
    }
    /**
     * Fetches products from the WooCommerce Store API (wc/store/v1/products).
     * Converts consumer field names to Store API _fields, then transforms the response
     * back to the requested format (e.g. title from name, price from prices, flat output).
     */
    async function fetchStoreApiProducts(client, apiParams, options = {}) {
        const { fields, flushCache = false } = options;
        const productParams = mapRestParamsToStoreApiProducts(apiParams);
        const response = await client.getWithNamespace("products", productParams, STORE_API_NAMESPACE, flushCache);
        if (fields && fields.length > 0) {
            return transformStoreApiProductsResponse(response, fields);
        }
        return response;
    }
    /**
     * Fetches terms from a WooCommerce Store API term endpoint (e.g. products/categories, products/tags).
     * Converts consumer field names to Store API _fields, then transforms the response
     * back to the requested format (e.g. name → title/rendered, image → image_url, link).
     */
    async function fetchStoreApiTerms(client, endpoint, apiParams, options = {}) {
        const { fields, flushCache = false } = options;
        const termParams = mapRestParamsToStoreApiTerms(apiParams);
        const response = await client.getWithNamespace(endpoint, termParams, STORE_API_NAMESPACE, flushCache);
        if (fields && fields.length > 0) {
            return transformStoreApiTermsResponse(response, fields);
        }
        return response;
    }
    /**
     * Detect if plain query params represent a single-product request.
     * Single product = one item by id (include with one id) or by slug.
     */
    function isSingleProductPlainParams(params) {
        if (!params || typeof params !== "object")
            return false;
        const include = params["include"];
        if (Array.isArray(include) && include.length === 1)
            return true;
        const slug = params["slug"];
        if (typeof slug === "string" && slug !== "")
            return true;
        if (Array.isArray(slug) && slug.length === 1 && typeof slug[0] === "string" && slug[0] !== "")
            return true;
        return false;
    }
    /**
     * Get taxonomy from plain term params (e.g. { taxonomy: "product_cat" }).
     */
    function getTaxonomyFromPlainTermParams(params) {
        if (!params || typeof params !== "object")
            return undefined;
        const t = params["taxonomy"];
        if (typeof t === "string" && t !== "")
            return t;
        if (Array.isArray(t) && t.length > 0 && typeof t[0] === "string" && t[0] !== "")
            return t[0];
        return undefined;
    }
    /**
     * Get single-term identifier from plain term params.
     * Returns { slug }, { include }, or { name } when exactly one term is requested; otherwise null.
     */
    function getSingleTermFromPlainTermParams(params) {
        if (!params || typeof params !== "object")
            return null;
        const slug = params["slug"];
        if (typeof slug === "string" && slug !== "")
            return { slug };
        if (Array.isArray(slug) && slug.length === 1 && typeof slug[0] === "string" && slug[0] !== "")
            return { slug: slug[0] };
        const include = params["include"];
        if (Array.isArray(include) && include.length === 1)
            return { include: include[0] };
        if (typeof include === "number" || (typeof include === "string" && include !== ""))
            return { include };
        const name = params["name"];
        if (typeof name === "string" && name !== "")
            return { name };
        if (Array.isArray(name) && name.length === 1 && typeof name[0] === "string" && name[0] !== "")
            return { name: name[0] };
        return null;
    }
    /**
     * Minimal HTML entity decoder for common entities used in titles/names.
     * Converts things like "Laptops &amp; Computers" → "Laptops & Computers".
     */
    function decodeHtmlEntities(value) {
        if (typeof value !== "string" || value === "")
            return value;
        return value
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, "\"")
            .replace(/&#039;/g, "'");
    }
    /**
     * Build ecommerce shop breadcrumbs from plain query and term params.
     * Does not include the shop (first) item; add it when rendering.
     * - Single term (e.g. taxonomy + include: [id]): parent terms → current term
     * - Single product (e.g. include: [id] or slug): product category (first if several) → product
     * - Other: empty array
     * Uses Store API for products and product taxonomies only.
     */
    async function fetchShopBreadcrumbs(client, queryParams, termParams, options = {}) {
        const { flushCache = false } = options;
        const qv = queryParams !== null && queryParams !== void 0 ? queryParams : {};
        const tv = termParams !== null && termParams !== void 0 ? termParams : {};
        const isSingleProduct = isSingleProductPlainParams(qv);
        const taxonomyStr = getTaxonomyFromPlainTermParams(tv);
        const singleTermId = getSingleTermFromPlainTermParams(tv);
        const isSingleTerm = Boolean(taxonomyStr && singleTermId);
        if (isSingleProduct) {
            return buildSingleProductBreadcrumbs(client, qv, flushCache);
        }
        if (isSingleTerm && taxonomyStr) {
            const endpoint = getStoreTermEndpoint(taxonomyStr);
            if (endpoint !== undefined) {
                return buildSingleTermBreadcrumbs(client, tv, taxonomyStr, endpoint, singleTermId !== null && singleTermId !== void 0 ? singleTermId : undefined, flushCache);
            }
        }
        return [];
    }
    /** Minimal product fields for breadcrumbs: id, name, link, and categories (for first category link/name). */
    const BREADCRUMB_PRODUCT_FIELDS = ["id", "name", "link", "categories"];
    /** Minimal term fields for breadcrumbs: id, name, link, parent. */
    const BREADCRUMB_TERM_FIELDS = ["id", "name", "link", "parent"];
    async function buildSingleProductBreadcrumbs(client, queryParams, flushCache) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const include = queryParams["include"];
        const slug = queryParams["slug"];
        const singleProductParams = {
            per_page: 1,
            _fields: BREADCRUMB_PRODUCT_FIELDS.join(","),
        };
        if (Array.isArray(include) && include.length === 1) {
            singleProductParams["include"] = include[0];
        }
        else if (typeof slug === "string" && slug !== "") {
            singleProductParams["slug"] = slug;
        }
        else if (Array.isArray(slug) && slug.length === 1 && typeof slug[0] === "string") {
            singleProductParams["slug"] = slug[0];
        }
        else {
            return [];
        }
        const productParams = mapRestParamsToStoreApiProducts(singleProductParams);
        const response = await fetchStoreApiProducts(client, productParams, {
            fields: BREADCRUMB_PRODUCT_FIELDS,
            flushCache,
        });
        const products = (_a = response === null || response === void 0 ? void 0 : response.data) !== null && _a !== void 0 ? _a : [];
        const product = Array.isArray(products) ? products[0] : null;
        if (!product) {
            return [];
        }
        const prod = product;
        const link = (_c = (_b = prod.link) !== null && _b !== void 0 ? _b : prod.permalink) !== null && _c !== void 0 ? _c : "";
        const rawTitle = (_f = (_d = prod.name) !== null && _d !== void 0 ? _d : (_e = prod.title) === null || _e === void 0 ? void 0 : _e.rendered) !== null && _f !== void 0 ? _f : "";
        const categories = prod.categories;
        const firstCat = categories === null || categories === void 0 ? void 0 : categories[0];
        const items = [];
        if (firstCat && typeof firstCat === "object") {
            const catLink = (_h = (_g = firstCat.permalink) !== null && _g !== void 0 ? _g : firstCat.link) !== null && _h !== void 0 ? _h : "";
            const catTitle = decodeHtmlEntities(String((_k = (_j = firstCat.name) !== null && _j !== void 0 ? _j : firstCat.title) !== null && _k !== void 0 ? _k : ""));
            if (catLink || catTitle) {
                items.push({ link: String(catLink), title: String(catTitle) });
            }
        }
        items.push({ link: String(link), title: decodeHtmlEntities(String(rawTitle)) });
        return items;
    }
    async function buildSingleTermBreadcrumbs(client, termParams, taxonomyStr, endpoint, singleTermId, flushCache) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const singleTermParams = {
            taxonomy: taxonomyStr,
            per_page: 1,
            _fields: BREADCRUMB_TERM_FIELDS.join(","),
        };
        if ((singleTermId === null || singleTermId === void 0 ? void 0 : singleTermId.slug) != null) {
            singleTermParams["slug"] = singleTermId.slug;
        }
        else if ((singleTermId === null || singleTermId === void 0 ? void 0 : singleTermId.include) !== undefined) {
            singleTermParams["include"] = Array.isArray(singleTermId.include) ? singleTermId.include[0] : singleTermId.include;
        }
        else if ((singleTermId === null || singleTermId === void 0 ? void 0 : singleTermId.name) != null) {
            singleTermParams["name"] = singleTermId.name;
        }
        else {
            return [];
        }
        const params = mapRestParamsToStoreApiTerms(singleTermParams);
        const response = await fetchStoreApiTerms(client, endpoint, params, {
            fields: BREADCRUMB_TERM_FIELDS,
            flushCache,
        });
        const terms = (_a = response === null || response === void 0 ? void 0 : response.data) !== null && _a !== void 0 ? _a : [];
        const current = Array.isArray(terms) ? terms[0] : null;
        if (!current) {
            return [];
        }
        const currentTerm = current;
        let parentId = typeof currentTerm.parent === "number" ? currentTerm.parent : Number(currentTerm.parent) || 0;
        const ancestry = [];
        while (parentId > 0) {
            const parentParams = mapRestParamsToStoreApiTerms({
                taxonomy: taxonomyStr,
                include: parentId,
                per_page: 1,
                _fields: BREADCRUMB_TERM_FIELDS.join(","),
            });
            const parentResponse = await fetchStoreApiTerms(client, endpoint, parentParams, {
                fields: BREADCRUMB_TERM_FIELDS,
                flushCache,
            });
            const parentTerms = (_b = parentResponse === null || parentResponse === void 0 ? void 0 : parentResponse.data) !== null && _b !== void 0 ? _b : [];
            const parentTerm = Array.isArray(parentTerms) ? parentTerms[0] : null;
            if (!parentTerm)
                break;
            const p = parentTerm;
            ancestry.unshift({
                link: String((_d = (_c = p.link) !== null && _c !== void 0 ? _c : p.permalink) !== null && _d !== void 0 ? _d : ""),
                title: decodeHtmlEntities(String((_f = (_e = p.name) !== null && _e !== void 0 ? _e : p.title) !== null && _f !== void 0 ? _f : "")),
            });
            parentId = typeof p.parent === "number" ? p.parent : Number(p.parent) || 0;
        }
        const currentItem = {
            link: String((_h = (_g = currentTerm.link) !== null && _g !== void 0 ? _g : currentTerm.permalink) !== null && _h !== void 0 ? _h : ""),
            title: decodeHtmlEntities(String((_k = (_j = currentTerm.name) !== null && _j !== void 0 ? _j : currentTerm.title) !== null && _k !== void 0 ? _k : "")),
        };
        return [...ancestry, currentItem];
    }

    /**
     * Converts WP_Query JSON representation to WordPress REST API endpoint parameters
     *
     * This function maps WP_Query parameters to their REST API equivalents for GET requests.
     * Works with all three API types:
     * - wp/v2 (standard WordPress API for posts/pages)
     * - wvc/v1 (ecommerce products)
     * - wvc/v1 (custom post types)
     *
     * Used for querying:
     * - Posts, pages, products, and custom post types
     * - Terms (taxonomies)
     *
     * @param query - WP_Query JSON representation (from toJSON() method)
     * @returns REST API parameters object ready to be used in API GET requests
     *
     * @example
     * ```typescript
     * const queryJson = {
     *   query_vars: { posts_per_page: 10, orderby: 'date', order: 'DESC' },
     *   meta_query: false,
     *   tax_query: null,
     *   date_query: false
     * };
     * const restParams = wpQueryToRest(queryJson);
     * // Returns: { per_page: 10, orderby: 'date', order: 'desc' }
     * ```
     */
    function wpQueryToRest(query) {
        var _a, _b, _c;
        const query_vars = query.query_vars;
        const meta_query = (_a = query.meta_query) !== null && _a !== void 0 ? _a : false;
        const tax_query = (_b = query.tax_query) !== null && _b !== void 0 ? _b : null;
        const date_query = (_c = query.date_query) !== null && _c !== void 0 ? _c : false;
        const apiParams = {};
        // Basic pagination and ordering
        if (query_vars.posts_per_page !== undefined && query_vars.posts_per_page !== "") {
            apiParams["per_page"] = query_vars.posts_per_page;
        }
        else if (query_vars.per_page !== undefined && query_vars.per_page !== "") {
            // Pass-through: REST-style per_page directly in query_vars
            apiParams["per_page"] = query_vars.per_page;
        }
        if (query_vars.paged !== undefined && query_vars.paged !== "") {
            apiParams["page"] = query_vars.paged;
        }
        else if (query_vars.page !== undefined && query_vars.page !== "") {
            // Pass-through: REST-style page directly in query_vars
            apiParams["page"] = query_vars.page;
        }
        if (query_vars.offset !== undefined && query_vars.offset !== "") {
            apiParams["offset"] = query_vars.offset;
        }
        if (query_vars.orderby !== undefined && query_vars.orderby !== "") {
            // Handle array orderby (REST API typically uses first value or comma-separated)
            if (Array.isArray(query_vars.orderby)) {
                apiParams["orderby"] = query_vars.orderby.join(",");
            }
            else {
                apiParams["orderby"] = query_vars.orderby;
            }
        }
        if (query_vars.order !== undefined && query_vars.order !== "") {
            // Convert to lowercase for REST API
            const order = String(query_vars.order).toLowerCase();
            apiParams["order"] = order === "asc" || order === "desc" ? order : "desc";
        }
        // Post type and status
        if (query_vars.post_status !== undefined && query_vars.post_status !== "") {
            // REST API uses 'status' instead of 'post_status'
            if (Array.isArray(query_vars.post_status)) {
                apiParams["status"] = query_vars.post_status.join(",");
            }
            else {
                apiParams["status"] = query_vars.post_status;
            }
        }
        // Note: post_type is typically handled via endpoint selection, not as a parameter
        // Search
        if (query_vars.s !== undefined && query_vars.s !== "") {
            apiParams["search"] = query_vars.s;
        }
        // Author filtering
        if (query_vars.author !== undefined && query_vars.author !== "") {
            apiParams["author"] = query_vars.author;
        }
        if (query_vars.author__in !== undefined && Array.isArray(query_vars.author__in) && query_vars.author__in.length > 0) {
            apiParams["author"] = query_vars.author__in.join(",");
        }
        if (query_vars.author__not_in !== undefined && Array.isArray(query_vars.author__not_in) && query_vars.author__not_in.length > 0) {
            apiParams["author_exclude"] = query_vars.author__not_in.join(",");
        }
        // Post ID filtering
        if (query_vars.post__in !== undefined && Array.isArray(query_vars.post__in) && query_vars.post__in.length > 0) {
            apiParams["include"] = query_vars.post__in.join(",");
        }
        else if (query_vars.include !== undefined && query_vars.include !== "") {
            // Pass-through: REST-style include directly in query_vars
            if (Array.isArray(query_vars.include) && query_vars.include.length > 0) {
                apiParams["include"] = query_vars.include.join(",");
            }
            else if (!Array.isArray(query_vars.include)) {
                apiParams["include"] = query_vars.include;
            }
        }
        if (query_vars.post__not_in !== undefined && Array.isArray(query_vars.post__not_in) && query_vars.post__not_in.length > 0) {
            apiParams["exclude"] = query_vars.post__not_in.join(",");
        }
        else if (query_vars.exclude !== undefined && query_vars.exclude !== "") {
            // Pass-through: REST-style exclude directly in query_vars
            if (Array.isArray(query_vars.exclude) && query_vars.exclude.length > 0) {
                apiParams["exclude"] = query_vars.exclude.join(",");
            }
            else if (!Array.isArray(query_vars.exclude)) {
                apiParams["exclude"] = query_vars.exclude;
            }
        }
        // Slug filtering (name or pagename)
        if (query_vars.name !== undefined && query_vars.name !== "") {
            apiParams["slug"] = query_vars.name;
        }
        else if (query_vars.pagename !== undefined && query_vars.pagename !== "") {
            apiParams["slug"] = query_vars.pagename;
        }
        if (query_vars.post_name__in !== undefined && Array.isArray(query_vars.post_name__in) && query_vars.post_name__in.length > 0) {
            apiParams["slug"] = query_vars.post_name__in.join(",");
        }
        // Parent filtering
        if (query_vars.post_parent !== undefined && query_vars.post_parent !== "") {
            apiParams["parent"] = query_vars.post_parent;
        }
        if (query_vars.post_parent__in !== undefined && Array.isArray(query_vars.post_parent__in) && query_vars.post_parent__in.length > 0) {
            apiParams["parent"] = query_vars.post_parent__in.join(",");
        }
        if (query_vars.post_parent__not_in !== undefined && Array.isArray(query_vars.post_parent__not_in) && query_vars.post_parent__not_in.length > 0) {
            apiParams["parent_exclude"] = query_vars.post_parent__not_in.join(",");
        }
        // Category filtering
        if (query_vars.cat !== undefined && query_vars.cat !== "") {
            // cat can be a number or comma-separated string
            apiParams["categories"] = String(query_vars.cat);
        }
        if (query_vars.category_name !== undefined && query_vars.category_name !== "") {
            // category_name is a slug, REST API needs category IDs, but we'll pass it as-is
            // The API might handle slug lookups
            apiParams["categories"] = query_vars.category_name;
        }
        if (query_vars.category__in !== undefined && Array.isArray(query_vars.category__in) && query_vars.category__in.length > 0) {
            apiParams["categories"] = query_vars.category__in.join(",");
        }
        if (query_vars.category__not_in !== undefined && Array.isArray(query_vars.category__not_in) && query_vars.category__not_in.length > 0) {
            apiParams["categories_exclude"] = query_vars.category__not_in.join(",");
        }
        // Tag filtering
        if (query_vars.tag !== undefined && query_vars.tag !== "") {
            // tag is a slug, REST API might handle it
            apiParams["tags"] = query_vars.tag;
        }
        if (query_vars.tag_id !== undefined && query_vars.tag_id !== "") {
            apiParams["tags"] = query_vars.tag_id;
        }
        if (query_vars.tag__in !== undefined && Array.isArray(query_vars.tag__in) && query_vars.tag__in.length > 0) {
            apiParams["tags"] = query_vars.tag__in.join(",");
        }
        if (query_vars.tag__not_in !== undefined && Array.isArray(query_vars.tag__not_in) && query_vars.tag__not_in.length > 0) {
            apiParams["tags_exclude"] = query_vars.tag__not_in.join(",");
        }
        if (query_vars.tag_slug__in !== undefined && Array.isArray(query_vars.tag_slug__in) && query_vars.tag_slug__in.length > 0) {
            // Tag slugs - REST API might handle these, but typically needs IDs
            apiParams["tags"] = query_vars.tag_slug__in.join(",");
        }
        if (query_vars.tag_slug__and !== undefined && Array.isArray(query_vars.tag_slug__and) && query_vars.tag_slug__and.length > 0) {
            // AND relation for tag slugs - REST API typically uses comma for AND
            apiParams["tags"] = query_vars.tag_slug__and.join(",");
        }
        // Date filtering - convert year/monthnum/day to date range if possible
        if (query_vars.year !== undefined && query_vars.year !== "") {
            const year = Number(query_vars.year);
            const month = query_vars.monthnum !== undefined && query_vars.monthnum !== "" ? Number(query_vars.monthnum) : null;
            const day = query_vars.day !== undefined && query_vars.day !== "" ? Number(query_vars.day) : null;
            if (month && day) {
                // Specific date
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                apiParams["after"] = `${dateStr}T00:00:00`;
                apiParams["before"] = `${dateStr}T23:59:59`;
            }
            else if (month) {
                // Year and month
                const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
                const endDate = new Date(year, month, 0).toISOString().split("T")[0];
                apiParams["after"] = `${startDate}T00:00:00`;
                apiParams["before"] = `${endDate}T23:59:59`;
            }
            else {
                // Just year
                apiParams["after"] = `${year}-01-01T00:00:00`;
                apiParams["before"] = `${year}-12-31T23:59:59`;
            }
        }
        // Date query handling
        if (date_query && typeof date_query === "object") {
            if (Array.isArray(date_query)) {
                // Array of date queries - process first one (REST API typically supports one date range)
                const firstDateQuery = date_query[0];
                if (typeof firstDateQuery === "object" && firstDateQuery !== null) {
                    const dq = firstDateQuery;
                    if (dq["after"] !== undefined) {
                        apiParams["after"] = dq["after"];
                    }
                    if (dq["before"] !== undefined) {
                        apiParams["before"] = dq["before"];
                    }
                    if (dq["year"] !== undefined) {
                        const year = Number(dq["year"]);
                        const month = dq["month"] !== undefined ? Number(dq["month"]) : null;
                        const day = dq["day"] !== undefined ? Number(dq["day"]) : null;
                        if (month && day) {
                            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            apiParams["after"] = `${dateStr}T00:00:00`;
                            apiParams["before"] = `${dateStr}T23:59:59`;
                        }
                        else if (month) {
                            const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
                            const endDate = new Date(year, month, 0).toISOString().split("T")[0];
                            apiParams["after"] = `${startDate}T00:00:00`;
                            apiParams["before"] = `${endDate}T23:59:59`;
                        }
                        else {
                            apiParams["after"] = `${year}-01-01T00:00:00`;
                            apiParams["before"] = `${year}-12-31T23:59:59`;
                        }
                    }
                }
            }
            else if (!Array.isArray(date_query)) {
                // Single date query object
                const dq = date_query;
                if (dq["after"] !== undefined) {
                    apiParams["after"] = dq["after"];
                }
                if (dq["before"] !== undefined) {
                    apiParams["before"] = dq["before"];
                }
                if (dq["year"] !== undefined) {
                    const year = Number(dq["year"]);
                    const month = dq["month"] !== undefined ? Number(dq["month"]) : null;
                    const day = dq["day"] !== undefined ? Number(dq["day"]) : null;
                    if (month && day) {
                        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        apiParams["after"] = `${dateStr}T00:00:00`;
                        apiParams["before"] = `${dateStr}T23:59:59`;
                    }
                    else if (month) {
                        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
                        const endDate = new Date(year, month, 0).toISOString().split("T")[0];
                        apiParams["after"] = `${startDate}T00:00:00`;
                        apiParams["before"] = `${endDate}T23:59:59`;
                    }
                    else {
                        apiParams["after"] = `${year}-01-01T00:00:00`;
                        apiParams["before"] = `${year}-12-31T23:59:59`;
                    }
                }
            }
        }
        // Taxonomy query handling - supports arrays, nested queries, and relations
        if (tax_query && typeof tax_query === "object") {
            processTaxQuery(tax_query, apiParams);
        }
        // Meta query handling - supports arrays, nested queries, and relations
        // Note: REST API has limitations on complex meta queries, so we handle what's possible
        if (meta_query && typeof meta_query === "object") {
            processMetaQuery(meta_query, apiParams);
        }
        // Simple meta_key/meta_value (legacy WP_Query format)
        if (query_vars.meta_key !== undefined && query_vars.meta_key !== "") {
            apiParams["meta_key"] = query_vars.meta_key;
        }
        if (query_vars.meta_value !== undefined && query_vars.meta_value !== "") {
            apiParams["meta_value"] = query_vars.meta_value;
        }
        // Sticky posts
        if (query_vars.ignore_sticky_posts !== undefined) {
            // REST API uses 'sticky' boolean, WP_Query uses 'ignore_sticky_posts'
            apiParams["sticky"] = !query_vars.ignore_sticky_posts;
        }
        // Menu order
        if (query_vars.menu_order !== undefined && query_vars.menu_order !== "") {
            apiParams["menu_order"] = query_vars.menu_order;
        }
        // Context and REST controls (if present in query_vars)
        if (query_vars.context !== undefined) {
            apiParams["context"] = query_vars.context;
        }
        if (query_vars._fields !== undefined) {
            apiParams["_fields"] = Array.isArray(query_vars._fields)
                ? query_vars._fields.join(",")
                : query_vars._fields;
        }
        if (query_vars._embed !== undefined) {
            apiParams["_embed"] = Array.isArray(query_vars._embed)
                ? query_vars._embed.join(",")
                : query_vars._embed;
        }
        // Remove empty string values (WP_Query uses empty strings as defaults)
        Object.keys(apiParams).forEach((key) => {
            if (apiParams[key] === "" || apiParams[key] === null || apiParams[key] === undefined) {
                delete apiParams[key];
            }
        });
        return apiParams;
    }
    /**
     * Processes taxonomy query structure (supports arrays, nested queries, and relations)
     *
     * WordPress tax_query can be:
     * - An array of query objects: [{ taxonomy: 'category', terms: [1,2] }, { taxonomy: 'tag', terms: ['red'] }]
     * - An object with relation and nested queries: { relation: 'AND', [queries...] }
     * - A single query object: { taxonomy: 'category', terms: [1,2] }
     *
     * @param tax_query - Taxonomy query object or array
     * @param apiParams - API parameters object to populate
     */
    function processTaxQuery(tax_query, apiParams) {
        if (Array.isArray(tax_query)) {
            // Array of tax queries
            // Check if first element has 'relation' (indicating it's an object wrapper)
            let relation = "AND";
            let queries = tax_query;
            // Check if array has relation property (unlikely in JS, but check first element)
            if (tax_query.length > 0 && typeof tax_query[0] === "object" && tax_query[0] !== null) {
                const first = tax_query[0];
                if ("relation" in first && !("taxonomy" in first)) {
                    // First element is a relation wrapper, not a query
                    relation = String(first["relation"] || "AND");
                    queries = tax_query.slice(1);
                }
            }
            // Process each tax query
            queries.forEach((taxQuery) => {
                if (typeof taxQuery === "object" && taxQuery !== null) {
                    // Check if this is a nested query (has nested array)
                    if (Array.isArray(taxQuery)) {
                        // Nested query - recursively process
                        processTaxQuery(taxQuery, apiParams);
                    }
                    else {
                        // Regular tax query object
                        const tq = taxQuery;
                        if (tq["taxonomy"] && tq["terms"]) {
                            const taxonomy = String(tq["taxonomy"]);
                            const terms = Array.isArray(tq["terms"])
                                ? tq["terms"].join(",")
                                : String(tq["terms"]);
                            const operator = tq["operator"] || "IN";
                            if (operator === "NOT IN" || operator === "NOT_IN" || operator === "NOTIN") {
                                // For NOT IN, use _exclude suffix
                                const existing = apiParams[`${taxonomy}_exclude`];
                                if (existing) {
                                    apiParams[`${taxonomy}_exclude`] = `${existing},${terms}`;
                                }
                                else {
                                    apiParams[`${taxonomy}_exclude`] = terms;
                                }
                            }
                            else if (operator === "AND") {
                                // For AND, comma-separate (REST API typically uses comma for AND)
                                const existing = apiParams[taxonomy];
                                if (existing) {
                                    apiParams[taxonomy] = `${existing},${terms}`;
                                }
                                else {
                                    apiParams[taxonomy] = terms;
                                }
                            }
                            else {
                                // IN, EXISTS, etc. - default behavior
                                const existing = apiParams[taxonomy];
                                if (existing && relation === "AND") {
                                    // If relation is AND, combine with comma
                                    apiParams[taxonomy] = `${existing},${terms}`;
                                }
                                else if (!existing) {
                                    apiParams[taxonomy] = terms;
                                }
                                // If relation is OR and already exists, REST API may not support this well
                                // We'll still set it, but note the limitation
                            }
                        }
                    }
                }
            });
        }
        else if (typeof tax_query === "object") {
            // Single tax query object
            const tq = tax_query;
            if (tq["taxonomy"] && tq["terms"]) {
                const taxonomy = String(tq["taxonomy"]);
                const terms = Array.isArray(tq["terms"])
                    ? tq["terms"].join(",")
                    : String(tq["terms"]);
                const operator = tq["operator"] || "IN";
                if (operator === "NOT IN" || operator === "NOT_IN" || operator === "NOTIN") {
                    apiParams[`${taxonomy}_exclude`] = terms;
                }
                else {
                    apiParams[taxonomy] = terms;
                }
            }
        }
    }
    /**
     * Processes meta query structure (supports arrays, nested queries, and relations)
     *
     * Note: REST API has limitations on complex meta queries. This function handles
     * what's possible, typically converting to simple meta_key/meta_value format.
     *
     * @param meta_query - Meta query object or array
     * @param apiParams - API parameters object to populate
     */
    function processMetaQuery(meta_query, apiParams) {
        if (Array.isArray(meta_query)) {
            // Array of meta queries
            // REST API typically only supports simple meta_key/meta_value queries
            // So we take the first query that has both key and value
            for (const metaQuery of meta_query) {
                if (typeof metaQuery === "object" && metaQuery !== null) {
                    // Check if this is a nested query (has nested array)
                    if (Array.isArray(metaQuery)) {
                        // Nested query - recursively process
                        processMetaQuery(metaQuery, apiParams);
                        // If we found one, break (REST API limitation)
                        if (apiParams["meta_key"])
                            break;
                    }
                    else {
                        // Regular meta query object
                        const mq = metaQuery;
                        if (mq["key"] && mq["value"] !== undefined) {
                            apiParams["meta_key"] = mq["key"];
                            apiParams["meta_value"] = mq["value"];
                            if (mq["compare"]) {
                                apiParams["meta_compare"] = mq["compare"];
                            }
                            if (mq["type"]) {
                                apiParams["meta_type"] = mq["type"];
                            }
                            // REST API typically only supports one meta query, so break
                            break;
                        }
                        else if (mq["key"] && (mq["compare"] === "EXISTS" || mq["compare"] === "NOT EXISTS")) {
                            // Handle EXISTS/NOT EXISTS (value not required)
                            apiParams["meta_key"] = mq["key"];
                            if (mq["compare"]) {
                                apiParams["meta_compare"] = mq["compare"];
                            }
                            break;
                        }
                    }
                }
            }
        }
        else if (typeof meta_query === "object") {
            // Single meta query object
            const mq = meta_query;
            if (mq["key"]) {
                apiParams["meta_key"] = mq["key"];
                if (mq["value"] !== undefined) {
                    apiParams["meta_value"] = mq["value"];
                }
                if (mq["compare"]) {
                    apiParams["meta_compare"] = mq["compare"];
                }
                if (mq["type"]) {
                    apiParams["meta_type"] = mq["type"];
                }
            }
        }
    }
    /**
     * Extracts the post_type from WP_Query JSON representation
     *
     * @param query - WP_Query JSON representation (from toJSON() method)
     * @returns The post_type value (string, array of strings, or undefined)
     *
     * @example
     * ```typescript
     * const queryJson = {
     *   query_vars: { post_type: 'product' },
     *   meta_query: false,
     *   tax_query: null,
     *   date_query: false
     * };
     * const postType = getPostTypeFromQuery(queryJson);
     * // Returns: 'product'
     * ```
     */
    function getPostTypeFromQuery(query) {
        const query_vars = query.query_vars;
        if (query_vars.post_type !== undefined && query_vars.post_type !== "") {
            return query_vars.post_type;
        }
        return undefined;
    }

    /**
     * Converts WP_Term_Query JSON representation to WordPress REST API endpoint parameters
     *
     * This function maps WP_Term_Query parameters to their REST API equivalents for GET requests.
     * Works with term/taxonomy endpoints:
     * - wp/v2 (standard WordPress API for categories/tags)
     * - wvc/v1 (custom taxonomies like product_cat, product_tag)
     *
     * Used for querying:
     * - Terms (categories, tags, custom taxonomy terms)
     *
     * @param query - WP_Term_Query JSON representation (from toJSON() method)
     * @returns REST API parameters object ready to be used in API GET requests
     *
     * @example
     * ```typescript
     * const queryJson = {
     *   query_vars: { taxonomy: 'category', number: 10, orderby: 'name', order: 'ASC' },
     *   meta_query: false
     * };
     * const restParams = wpTermQueryToRest(queryJson);
     * // Returns: { per_page: 10, orderby: 'name', order: 'asc' }
     * ```
     */
    function wpTermQueryToRest(query) {
        var _a;
        const query_vars = query.query_vars;
        const meta_query = (_a = query.meta_query) !== null && _a !== void 0 ? _a : false;
        const apiParams = {};
        // Basic pagination and ordering
        // Prefer explicit REST-style "per_page" if present, otherwise fall back to WP_Term_Query "number"
        const per_page = query_vars.per_page !== undefined && query_vars.per_page !== ""
            ? query_vars.per_page
            : query_vars.number;
        if (per_page !== undefined && per_page !== "" && per_page !== 0) {
            // WP_Term_Query uses "number", REST API uses "per_page"
            apiParams["per_page"] = per_page;
        }
        if (query_vars.offset !== undefined && query_vars.offset !== "" && query_vars.offset !== 0) {
            apiParams["offset"] = query_vars.offset;
        }
        if (query_vars.orderby !== undefined && query_vars.orderby !== "") {
            apiParams["orderby"] = query_vars.orderby;
        }
        if (query_vars.order !== undefined && query_vars.order !== "") {
            // Convert to lowercase for REST API
            const order = String(query_vars.order).toLowerCase();
            apiParams["order"] = order === "asc" || order === "desc" ? order : "asc";
        }
        // Search
        if (query_vars.search !== undefined && query_vars.search !== "") {
            apiParams["search"] = query_vars.search;
        }
        // Name filtering
        if (query_vars.name !== undefined && query_vars.name !== "") {
            if (Array.isArray(query_vars.name)) {
                apiParams["name"] = query_vars.name.join(",");
            }
            else {
                apiParams["name"] = query_vars.name;
            }
        }
        if (query_vars.name__like !== undefined && query_vars.name__like !== "") {
            // name__like is typically handled via search parameter
            apiParams["search"] = query_vars.name__like;
        }
        // Slug filtering
        if (query_vars.slug !== undefined && query_vars.slug !== "") {
            if (Array.isArray(query_vars.slug)) {
                apiParams["slug"] = query_vars.slug.join(",");
            }
            else {
                apiParams["slug"] = query_vars.slug;
            }
        }
        // Include/exclude specific terms
        if (query_vars.include !== undefined) {
            if (Array.isArray(query_vars.include) && query_vars.include.length > 0) {
                apiParams["include"] = query_vars.include.join(",");
            }
            else if (typeof query_vars.include === "string" && query_vars.include !== "") {
                apiParams["include"] = query_vars.include;
            }
        }
        if (query_vars.exclude !== undefined) {
            if (Array.isArray(query_vars.exclude) && query_vars.exclude.length > 0) {
                apiParams["exclude"] = query_vars.exclude.join(",");
            }
            else if (typeof query_vars.exclude === "string" && query_vars.exclude !== "") {
                apiParams["exclude"] = query_vars.exclude;
            }
        }
        if (query_vars.exclude_tree !== undefined) {
            // exclude_tree - REST API may not support this directly, but we'll try exclude
            if (Array.isArray(query_vars.exclude_tree) && query_vars.exclude_tree.length > 0) {
                const existingExclude = apiParams["exclude"];
                if (existingExclude) {
                    apiParams["exclude"] = `${existingExclude},${query_vars.exclude_tree.join(",")}`;
                }
                else {
                    apiParams["exclude"] = query_vars.exclude_tree.join(",");
                }
            }
        }
        // Hierarchical filtering
        if (query_vars.parent !== undefined && query_vars.parent !== "" && query_vars.parent !== 0) {
            apiParams["parent"] = query_vars.parent;
        }
        if (query_vars.child_of !== undefined && query_vars.child_of !== 0) {
            apiParams["child_of"] = query_vars.child_of;
        }
        // Taxonomy-specific parameters
        if (query_vars.hide_empty !== undefined) {
            // WP_Term_Query uses boolean or number (0/1), REST API uses boolean
            if (typeof query_vars.hide_empty === "number") {
                apiParams["hide_empty"] = query_vars.hide_empty !== 0;
            }
            else {
                apiParams["hide_empty"] = query_vars.hide_empty;
            }
        }
        if (query_vars.hierarchical !== undefined) {
            apiParams["hierarchical"] = query_vars.hierarchical;
        }
        if (query_vars.childless !== undefined) {
            apiParams["childless"] = query_vars.childless;
        }
        // Fields parameter
        if (query_vars.fields !== undefined && query_vars.fields !== "") {
            apiParams["fields"] = query_vars.fields;
        }
        // Get parameter
        if (query_vars.get !== undefined && query_vars.get !== "") {
            apiParams["get"] = query_vars.get;
        }
        // Object IDs (posts that have these terms)
        if (query_vars.object_ids !== undefined) {
            // WP_Term_Query uses 'object_ids', REST API uses 'post'
            if (Array.isArray(query_vars.object_ids)) {
                if (query_vars.object_ids.length > 0) {
                    // REST API typically uses first ID or comma-separated
                    apiParams["post"] = query_vars.object_ids.length === 1
                        ? query_vars.object_ids[0]
                        : query_vars.object_ids.join(",");
                }
            }
            else if (typeof query_vars.object_ids === "number") {
                apiParams["post"] = query_vars.object_ids;
            }
        }
        // Term taxonomy ID filtering
        if (query_vars.term_taxonomy_id !== undefined && query_vars.term_taxonomy_id !== "") {
            // REST API may not support term_taxonomy_id directly, but we can try
            if (Array.isArray(query_vars.term_taxonomy_id)) {
                apiParams["term_taxonomy_id"] = query_vars.term_taxonomy_id.join(",");
            }
            else {
                apiParams["term_taxonomy_id"] = query_vars.term_taxonomy_id;
            }
        }
        // Description search
        if (query_vars.description__like !== undefined && query_vars.description__like !== "") {
            // description__like - REST API may handle this via search, but some APIs support it directly
            apiParams["description__like"] = query_vars.description__like;
        }
        // Pad counts
        if (query_vars.pad_counts !== undefined) {
            apiParams["pad_counts"] = query_vars.pad_counts;
        }
        // Meta query handling - supports arrays, nested queries, and relations
        // Note: REST API has limitations on complex meta queries, so we handle what's possible
        if (meta_query && typeof meta_query === "object") {
            processTermMetaQuery(meta_query, apiParams);
        }
        // Simple meta_key/meta_value (legacy WP_Term_Query format)
        if (query_vars.meta_key !== undefined && query_vars.meta_key !== "") {
            apiParams["meta_key"] = Array.isArray(query_vars.meta_key)
                ? query_vars.meta_key.join(",")
                : query_vars.meta_key;
        }
        if (query_vars.meta_value !== undefined && query_vars.meta_value !== "") {
            apiParams["meta_value"] = Array.isArray(query_vars.meta_value)
                ? query_vars.meta_value.join(",")
                : query_vars.meta_value;
        }
        if (query_vars.meta_compare !== undefined && query_vars.meta_compare !== "") {
            apiParams["meta_compare"] = query_vars.meta_compare;
        }
        if (query_vars.meta_type !== undefined && query_vars.meta_type !== "") {
            apiParams["meta_type"] = query_vars.meta_type;
        }
        // Context and REST controls (if present in query_vars)
        if (query_vars.context !== undefined) {
            apiParams["context"] = query_vars.context;
        }
        if (query_vars._fields !== undefined) {
            apiParams["_fields"] = Array.isArray(query_vars._fields)
                ? query_vars._fields.join(",")
                : query_vars._fields;
        }
        if (query_vars._embed !== undefined) {
            apiParams["_embed"] = query_vars._embed;
        }
        // Remove empty string values and null/undefined (WP_Term_Query uses empty strings as defaults)
        Object.keys(apiParams).forEach((key) => {
            if (apiParams[key] === "" || apiParams[key] === null || apiParams[key] === undefined) {
                delete apiParams[key];
            }
        });
        return apiParams;
    }
    /**
     * Processes meta query structure for terms (supports arrays, nested queries, and relations)
     *
     * Note: REST API has limitations on complex meta queries. This function handles
     * what's possible, typically converting to simple meta_key/meta_value format.
     *
     * @param meta_query - Meta query object or array
     * @param apiParams - API parameters object to populate
     */
    function processTermMetaQuery(meta_query, apiParams) {
        if (Array.isArray(meta_query)) {
            // Array of meta queries
            // REST API typically only supports simple meta_key/meta_value queries
            // So we take the first query that has both key and value
            for (const metaQuery of meta_query) {
                if (typeof metaQuery === "object" && metaQuery !== null) {
                    // Check if this is a nested query (has nested array)
                    if (Array.isArray(metaQuery)) {
                        // Nested query - recursively process
                        processTermMetaQuery(metaQuery, apiParams);
                        // If we found one, break (REST API limitation)
                        if (apiParams["meta_key"])
                            break;
                    }
                    else {
                        // Regular meta query object
                        const mq = metaQuery;
                        if (mq["key"] && mq["value"] !== undefined) {
                            apiParams["meta_key"] = mq["key"];
                            apiParams["meta_value"] = mq["value"];
                            if (mq["compare"]) {
                                apiParams["meta_compare"] = mq["compare"];
                            }
                            if (mq["type"]) {
                                apiParams["meta_type"] = mq["type"];
                            }
                            // REST API typically only supports one meta query, so break
                            break;
                        }
                        else if (mq["key"] && (mq["compare"] === "EXISTS" || mq["compare"] === "NOT EXISTS")) {
                            // Handle EXISTS/NOT EXISTS (value not required)
                            apiParams["meta_key"] = mq["key"];
                            if (mq["compare"]) {
                                apiParams["meta_compare"] = mq["compare"];
                            }
                            break;
                        }
                    }
                }
            }
        }
        else if (typeof meta_query === "object") {
            // Single meta query object
            const mq = meta_query;
            if (mq["key"]) {
                apiParams["meta_key"] = mq["key"];
                if (mq["value"] !== undefined) {
                    apiParams["meta_value"] = mq["value"];
                }
                if (mq["compare"]) {
                    apiParams["meta_compare"] = mq["compare"];
                }
                if (mq["type"]) {
                    apiParams["meta_type"] = mq["type"];
                }
            }
        }
    }
    /**
     * Extracts the taxonomy from WP_Term_Query JSON representation
     *
     * @param query - WP_Term_Query JSON representation (from toJSON() method)
     * @returns The taxonomy value (string, array of strings, null, or undefined)
     *
     * @example
     * ```typescript
     * const queryJson = {
     *   query_vars: { taxonomy: 'category', number: 10 },
     *   meta_query: false
     * };
     * const taxonomy = getTaxonomyFromQuery(queryJson);
     * // Returns: 'category'
     * ```
     */
    function getTaxonomyFromQuery(query) {
        const query_vars = query.query_vars;
        if (query_vars.taxonomy !== undefined && query_vars.taxonomy !== null) {
            return query_vars.taxonomy;
        }
        return undefined;
    }

    /**
     * Main WordPress REST API Client
     * Simplified to core functionality with powerful parameter-based queries
     */
    class WordPress {
        constructor(config) {
            this.client = new WPClient(config);
            // Initialize API modules
            this.posts = new WPPostsAPI(this.client);
            this.taxonomies = new WPTaxonomiesAPI(this.client);
            this.meta = new WPMetaAPI(this.client);
            this.menus = new WPMenusAPI(this.client);
        }
        /**
         * Shorthand for posts.get_posts() - WordPress-style query function
         * @param params - WordPress query parameters (similar to WP_Query)
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<WPPost[]>>
         */
        async get_posts(params = {}, flushCache = false, postType = 'post') {
            if (postType == 'post') {
                if (flushCache) {
                    // If flushCache is true, we need to call the client directly with flushCache
                    const response = await this.client.get('posts', this.posts['transformQueryParams'](params), flushCache);
                    return response;
                }
                return this.posts.get_posts(params);
            }
            else {
                // Route to get_items for custom post types
                return this.get_items(postType, params, flushCache);
            }
        }
        /**
         * Shorthand for posts.get_pages() - Get pages with WordPress-style query parameters
         * @param params - WordPress query parameters (similar to WP_Query)
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<WPPage[]>>
         */
        async get_pages(params = {}, flushCache = false) {
            if (flushCache) {
                const response = await this.client.get('pages', this.posts['transformQueryParams'](params), flushCache);
                return response;
            }
            return this.posts.get_pages(params);
        }
        /**
         * Shorthand for posts.get_items() - Get items of a specific post type
         * @param postType - Post type to query (e.g., 'product', 'event', etc.)
         * @param params - WordPress query parameters (similar to WP_Query)
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<WPPost[] | WPPage[]>>
         */
        async get_items(postType, params = {}, flushCache = false) {
            if (flushCache) {
                const endpoint = mapPostTypeToEndpoint(postType);
                const response = await this.client.getWithNamespace(endpoint, this.posts['transformQueryParams'](params), 'wvc/v1', flushCache);
                return response;
            }
            return this.posts.get_items(postType, params);
        }
        /**
         * Shorthand for posts.get_post() - Get a single post by ID
         * @param id - Post ID
         * @param params - Additional query parameters
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPPost>
         */
        async get_post(id, params = {}, flushCache = false) {
            if (flushCache) {
                const response = await this.client.get(`posts/${id}`, params, flushCache);
                return response.data;
            }
            return this.posts.get_post(id, params);
        }
        /**
         * Shorthand for posts.get_page() - Get a single page by ID
         * @param id - Page ID
         * @param params - Additional query parameters
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPPage>
         */
        async get_page(id, params = {}, flushCache = false) {
            if (flushCache) {
                const response = await this.client.get(`pages/${id}`, params, flushCache);
                return response.data;
            }
            return this.posts.get_page(id, params);
        }
        /**
         * Shorthand for posts.get_item() - Get a single item by ID and post type
         * @param id - Item ID
         * @param postType - Post type (e.g., 'post', 'page', 'product', etc.)
         * @param params - Additional query parameters
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPPost | WPPage>
         */
        async get_item(id, postType, params = {}, flushCache = false) {
            if (flushCache) {
                const endpoint = mapPostTypeToEndpoint(postType);
                const response = await this.client.get(`${endpoint}/${id}`, params, flushCache);
                return response.data;
            }
            return this.posts.get_item(id, postType, params);
        }
        /**
         * Shorthand for taxonomies.get_terms() - WordPress-style terms query
         * @param params - Taxonomy query parameters
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<WPTerm[]>>
         */
        async get_terms(params = {}, flushCache = false) {
            if (flushCache) {
                const endpoint = mapTaxonomyToEndpoint(params.taxonomy || 'category');
                const response = await this.client.getWithNamespace(endpoint, this.taxonomies['transformQueryParams'](params), 'wvc/v1', flushCache);
                return response;
            }
            return this.taxonomies.get_terms(params);
        }
        /**
         * Query posts/pages/products/CPTs using WP_Query JSON representation
         * Parses WP_Query JSON, converts to REST API params, and routes to appropriate endpoint
         * @param wpQueryObject - WP_Query object representation (from toJSON() method)
         * @param params - Optional. Additional REST API parameters (fields, embeds, etc.)
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<WPPost[] | WPPage[]>>
         */
        async rest_wp_query(wpQueryObject, params = {}, flushCache = false) {
            // Convert WP_Query object to REST API parameters
            const restParams = wpQueryToRest(wpQueryObject);
            // Extract post_type to determine routing
            const postType = getPostTypeFromQuery(wpQueryObject);
            // Determine post type (default to 'post' if not specified)
            let postTypeStr = 'post';
            if (postType) {
                if (Array.isArray(postType)) {
                    // Use first post type if array
                    postTypeStr = postType[0] || 'post';
                }
                else {
                    postTypeStr = postType;
                }
            }
            // Extract fields and embeds from params
            const { fields, embeds, ...otherParams } = params;
            // Prepare params for API calls
            // For flushCache: use restParams directly (strings are fine)
            // For non-flushCache: need to convert to WPAdvancedQueryParams format (arrays for _fields)
            let apiParams;
            if (flushCache) {
                // For direct client calls, use strings (comma-separated)
                apiParams = { ...restParams, ...otherParams };
                if (fields && fields.length > 0) {
                    apiParams["_fields"] = fields.join(",");
                }
                if (embeds && embeds.length > 0) {
                    apiParams["_embed"] = embeds.join(",");
                }
            }
            else {
                // For API method calls, use arrays (transformQueryParams will join them)
                apiParams = { ...restParams, ...otherParams };
                if (fields && fields.length > 0) {
                    apiParams["_fields"] = fields;
                }
                if (embeds && embeds.length > 0) {
                    apiParams["_embed"] = embeds;
                }
            }
            // Route to appropriate method based on post type
            if (postTypeStr === "post") {
                if (flushCache) {
                    const response = await this.client.get("posts", apiParams, flushCache);
                    return response;
                }
                return this.posts.get_posts(apiParams);
            }
            else if (postTypeStr === "page") {
                if (flushCache) {
                    const response = await this.client.get("pages", apiParams, flushCache);
                    return response;
                }
                return this.posts.get_pages(apiParams);
            }
            else if (postTypeStr === "product") {
                return fetchStoreApiProducts(this.client, apiParams, { fields, flushCache });
            }
            else {
                // Custom post type - route to get_items
                if (flushCache) {
                    const endpoint = mapPostTypeToEndpoint(postTypeStr);
                    const response = await this.client.getWithNamespace(endpoint, apiParams, 'wvc/v1', flushCache);
                    return response;
                }
                return this.posts.get_items(postTypeStr, apiParams);
            }
        }
        /**
         * Query terms using WP_Term_Query JSON representation
         * Parses WP_Term_Query JSON, converts to REST API params, and routes to appropriate endpoint
         * @param termQueryObject - WP_Term_Query object representation (from toJSON() method)
         * @param params - Optional. Additional REST API parameters (fields, embeds, etc.)
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<WPTerm[]>>
         */
        async rest_wp_term_query(termQueryObject, params = {}, flushCache = false) {
            // Convert WP_Term_Query object to REST API parameters
            const restParams = wpTermQueryToRest(termQueryObject);
            // Extract taxonomy to determine endpoint
            const taxonomy = getTaxonomyFromQuery(termQueryObject);
            // Determine taxonomy (default to "category" if not specified)
            let taxonomyStr = "category";
            if (taxonomy) {
                if (taxonomy === null) {
                    taxonomyStr = "category";
                }
                else if (Array.isArray(taxonomy)) {
                    // Use first taxonomy if array
                    taxonomyStr = taxonomy[0] || "category";
                }
                else {
                    taxonomyStr = taxonomy;
                }
            }
            // Extract fields and embeds from params (these are for _fields and _embed REST API params)
            const { fields: fieldsParam, embeds: embedsParam, ...otherParams } = params;
            // Prepare params for API calls
            // For flushCache: use restParams directly (strings are fine)
            // For non-flushCache: need to convert to WPTaxonomyQueryParams format
            let apiParams;
            if (flushCache) {
                // For direct client calls, use strings (comma-separated)
                apiParams = { ...restParams, ...otherParams };
                if (fieldsParam && fieldsParam.length > 0) {
                    apiParams["_fields"] = fieldsParam.join(",");
                }
                if (embedsParam && embedsParam.length > 0) {
                    apiParams["_embed"] = embedsParam.join(",");
                }
            }
            else {
                // For API method calls, pass as-is (taxonomies transformQueryParams accepts both)
                apiParams = { ...restParams, ...otherParams };
                if (fieldsParam && fieldsParam.length > 0) {
                    apiParams["_fields"] = fieldsParam;
                }
                if (embedsParam && embedsParam.length > 0) {
                    apiParams["_embed"] = embedsParam;
                }
            }
            // Route to WooCommerce Store API for product taxonomies
            const storeTermEndpoint = getStoreTermEndpoint(taxonomyStr);
            if (storeTermEndpoint !== undefined) {
                return fetchStoreApiTerms(this.client, storeTermEndpoint, apiParams, {
                    fields: fieldsParam,
                    flushCache,
                });
            }
            // Route to get_terms with proper endpoint handling (wvc/v1)
            if (flushCache) {
                const endpoint = mapTaxonomyToEndpoint(taxonomyStr);
                const response = await this.client.getWithNamespace(endpoint, apiParams, "wvc/v1", flushCache);
                return response;
            }
            // For non-flushCache, use get_terms which expects taxonomy in params for endpoint mapping
            const { fields: __, ...apiParamsWithoutFields } = apiParams;
            const termParams = {
                ...apiParamsWithoutFields,
                taxonomy: taxonomyStr
            };
            return this.taxonomies.get_terms(termParams);
        }
        /**
         * Build ecommerce shop breadcrumbs from plain query and term params.
         * Delegates to fetchShopBreadcrumbs in store.ts.
         * - Single term (e.g. taxonomy + include: [id]): parent terms → current term
         * - Single product (e.g. include: [id] or slug): product category (first if several) → product
         * - Other: empty array (add shop item when rendering)
         * @param queryParams - Plain product/query params (e.g. per_page, order, product_cat, include, slug)
         * @param termParams - Plain term params (e.g. taxonomy, include, slug)
         * @param flushCache - Whether to bypass cache for API calls
         * @returns Promise<ShopBreadcrumbItem[]>
         */
        async rest_shop_breadcrumbs(queryParams, termParams, flushCache = false) {
            return fetchShopBreadcrumbs(this.client, queryParams, termParams, { flushCache });
        }
        /**
         * Shorthand for taxonomies.get_taxonomies() - WordPress-style taxonomies query
         * @param params - Query parameters
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<WPTaxonomy[]>>
         */
        async get_taxonomies(params = {}, flushCache = false) {
            if (flushCache) {
                const response = await this.client.get('taxonomies', params, flushCache);
                return response;
            }
            return this.taxonomies.get_taxonomies(params);
        }
        /**
         * Shorthand for meta.get_meta() - WordPress-style meta query
         * @param params - Meta query parameters
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<any[]>>
         */
        async get_meta(params = {}, flushCache = false) {
            if (flushCache) {
                const endpoint = this.meta['buildEndpoint'](params);
                const response = await this.client.get(endpoint, this.meta['transformQueryParams'](params), flushCache);
                return response;
            }
            return this.meta.get_meta(params);
        }
        /**
         * Shorthand for menus.get_menus() - WordPress-style menus query
         * @param params - Query parameters
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<WPMenu[]>>
         */
        async get_menus(params = {}, flushCache = false) {
            if (flushCache) {
                const response = await this.client.getWithNamespace('menus', params, 'wvc/v1', flushCache);
                const menus = response.data.map((menu) => ({
                    id: menu.id,
                    name: menu.name,
                    slug: menu.slug,
                    description: menu.description || '',
                    count: menu.count || 0,
                    items: menu.items || []
                }));
                return {
                    data: menus,
                    headers: response.headers,
                    status: response.status
                };
            }
            return this.menus.get_menus(params);
        }
        /**
         * Shorthand for menus.get_menu() - Get single menu with items
         * @param menuId - Menu ID (required)
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<any>
         */
        async get_menu(menuId, flushCache = false) {
            if (flushCache) {
                const response = await this.client.getWithNamespace(`menus/${menuId}`, {}, 'wvc/v1', flushCache);
                const menu = response.data;
                return {
                    id: menu.id,
                    name: menu.name,
                    slug: menu.slug,
                    description: menu.description || '',
                    count: menu.count || 0,
                    items: menu.items || []
                };
            }
            return this.menus.get_menu(menuId);
        }
        /**
         * Shorthand for menus.get_menu_items() - WordPress-style menu items query
         * @param menuId - Menu ID (required)
         * @param params - Query parameters
         * @param flushCache - Whether to flush cache for this request
         * @returns Promise<WPResponse<WPMenuItem[]>>
         */
        async get_menu_items(menuId, params = {}, flushCache = false) {
            if (flushCache) {
                const response = await this.client.getWithNamespace(`menus/${menuId}`, {}, 'wvc/v1', flushCache);
                const menu = response.data;
                // Helper function to recursively process menu items and their children
                const processMenuItem = (item) => {
                    const processedItem = {
                        id: item.id,
                        title: item.title || '',
                        url: item.url || '',
                        target: item.target || '',
                        description: item.description || '',
                        classes: item.classes || [],
                        menu_order: item.order || item.menu_order || 0,
                        parent: item.parent || 0,
                        object_id: item.object_id || 0,
                        object: item.object_type || item.object || '',
                        type: item.type || item.object_type || 'custom',
                        resolved_url: item.resolved_url || item.url || '',
                        children: [],
                        _menu_item_type: item.type || item.object_type || 'custom',
                        _menu_item_object_id: parseInt(item.object_id) || 0,
                    };
                    // Process children recursively
                    if (item.children && Array.isArray(item.children)) {
                        processedItem.children = item.children.map(processMenuItem);
                    }
                    return processedItem;
                };
                // Return the items from the menu response
                const items = (menu.items || []).map(processMenuItem);
                return {
                    data: items,
                    headers: response.headers,
                    status: response.status
                };
            }
            return this.menus.get_menu_items(menuId);
        }
        // =============================================================================
        // UTILITY METHODS FOR WPResponse HANDLING
        // =============================================================================
        /**
         * Generic method to extract body/data from any WPResponse promise
         * Useful for backward compatibility when you want just the data
         * @param wpResponsePromise - Promise that resolves to WPResponse<T>
         * @returns Promise<T> - Just the data portion
         */
        async get_wp_response_body(wpResponsePromise) {
            const response = await wpResponsePromise;
            return response.data;
        }
        /**
         * Generic method to extract headers from any WPResponse promise
         * Useful for accessing pagination headers or other response metadata
         * @param wpResponsePromise - Promise that resolves to WPResponse<T>
         * @returns Promise<Record<string, string>> - Just the headers portion
         */
        async get_wp_response_headers(wpResponsePromise) {
            const response = await wpResponsePromise;
            return response.headers;
        }
        // =============================================================================
        // CACHE MANAGEMENT METHODS
        // =============================================================================
        /**
         * Get cache statistics
         * @returns Cache statistics object
         */
        getCacheStats() {
            return this.client.getCacheStats();
        }
        /**
         * Clear all cache entries
         */
        clearCache() {
            this.client.clearCache();
        }
        /**
         * Flush expired cache entries
         */
        flushCache() {
            this.client.flushCache();
        }
        /**
         * Clear cache entries by method name pattern
         * @param methodPattern - Method name pattern (regex string)
         * @returns Number of entries cleared
         */
        clearCacheByMethod(methodPattern) {
            return this.client.clearCacheByMethod(methodPattern);
        }
        /**
         * Flush cache for a specific method and arguments
         * @param methodName - Method name
         * @param args - Method arguments
         */
        flushCacheForMethod(methodName, args = []) {
            this.client.flushCacheForMethod(methodName, args);
        }
        /**
         * Enable caching
         */
        enableCache() {
            this.client.enableCache();
        }
        /**
         * Disable caching
         */
        disableCache() {
            this.client.disableCache();
        }
        /**
         * Check if cache is enabled
         * @returns True if cache is enabled
         */
        isCacheEnabled() {
            return this.client.isCacheEnabled();
        }
    }

    /**
     * WordPress REST API Cache
     *
     * Provides intelligent caching for WordPress REST API requests with:
     * - Method-based cache keys (method name + stringified arguments)
     * - TTL-based expiration
     * - LRU eviction when max entries reached
     * - Configurable cache behavior
     * - Memory management
     */
    class WPCache {
        constructor(config = {}) {
            this.cache = new Map();
            this.accessOrder = new Map(); // For LRU tracking
            this.accessCounter = 0;
            this.config = {
                enabled: true,
                ttl: 24 * 60 * 60 * 1000, // 24 hours default
                maxEntries: 1000,
                keyPrefix: "wp_cache_",
                ...config
            };
            this.stats = {
                hits: 0,
                misses: 0,
                entries: 0,
                maxEntries: this.config.maxEntries,
                hitRate: 0,
                memoryUsage: 0
            };
        }
        /**
         * Generate a cache key based on method name and arguments
         * @param methodName - Method name (e.g., "get_posts", "get_menu")
         * @param args - Method arguments (will be stringified)
         * @returns Cache key string
         */
        generateCacheKey(methodName, args = []) {
            // Sort arguments to ensure consistent cache keys regardless of order
            const sortedArgs = this.sortArguments(args);
            // Create a deterministic string representation of sorted arguments
            const argsString = JSON.stringify(sortedArgs);
            const baseKey = `${methodName}:${argsString}`;
            // Create a hash-like key (simple but effective)
            let hash = 0;
            for (let i = 0; i < baseKey.length; i++) {
                const char = baseKey.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return `${this.config.keyPrefix}${Math.abs(hash)}_${methodName.replace(/[^a-zA-Z0-9]/g, "_")}`;
        }
        /**
         * Sort arguments to ensure consistent cache keys
         * @param args - Method arguments
         * @returns Sorted arguments
         */
        sortArguments(args) {
            return args.map(arg => {
                if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
                    // Sort object keys alphabetically
                    const sortedObj = {};
                    Object.keys(arg).sort().forEach(key => {
                        sortedObj[key] = arg[key];
                    });
                    return sortedObj;
                }
                return arg;
            });
        }
        /**
         * Check if a cache entry is expired
         * @param entry - Cache entry
         * @returns True if expired
         */
        isExpired(entry) {
            const now = Date.now();
            return (now - entry.timestamp) > entry.ttl;
        }
        /**
         * Update access order for LRU eviction
         * @param key - Cache key
         */
        updateAccessOrder(key) {
            this.accessOrder.set(key, ++this.accessCounter);
        }
        /**
         * Find least recently used key
         * @returns LRU key or null
         */
        findLRUKey() {
            if (this.accessOrder.size === 0)
                return null;
            let lruKey = "";
            let lruCount = Number.MAX_SAFE_INTEGER;
            for (const [key, count] of this.accessOrder) {
                if (count < lruCount) {
                    lruCount = count;
                    lruKey = key;
                }
            }
            return lruKey || null;
        }
        /**
         * Evict entries if cache is full
         */
        evictIfNeeded() {
            while (this.cache.size >= this.config.maxEntries) {
                const lruKey = this.findLRUKey();
                if (lruKey) {
                    this.cache.delete(lruKey);
                    this.accessOrder.delete(lruKey);
                }
                else {
                    break;
                }
            }
        }
        /**
         * Clean expired entries from cache
         */
        cleanExpired() {
            const expiredKeys = [];
            for (const [key, entry] of this.cache) {
                if (this.isExpired(entry)) {
                    expiredKeys.push(key);
                }
            }
            expiredKeys.forEach(key => {
                this.cache.delete(key);
                this.accessOrder.delete(key);
            });
        }
        /**
         * Update cache statistics
         */
        updateStats() {
            this.stats.entries = this.cache.size;
            this.stats.hitRate = this.stats.hits + this.stats.misses > 0
                ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
                : 0;
            // Rough memory usage calculation
            this.stats.memoryUsage = this.cache.size * 1024; // Approximate 1KB per entry
        }
        /**
         * Get cached data by method name and arguments
         * @param methodName - Method name
         * @param args - Method arguments
         * @returns Cached data or null if not found/expired
         */
        get(methodName, args = []) {
            if (!this.config.enabled) {
                return null;
            }
            const key = this.generateCacheKey(methodName, args);
            const entry = this.cache.get(key);
            if (!entry) {
                this.stats.misses++;
                this.updateStats();
                return null;
            }
            if (this.isExpired(entry)) {
                this.cache.delete(key);
                this.accessOrder.delete(key);
                this.stats.misses++;
                this.updateStats();
                return null;
            }
            this.updateAccessOrder(key);
            this.stats.hits++;
            this.updateStats();
            return entry.data;
        }
        /**
         * Set cached data by method name and arguments
         * @param methodName - Method name
         * @param args - Method arguments
         * @param data - Data to cache
         * @param customTtl - Custom TTL for this entry
         */
        set(methodName, args = [], data, customTtl) {
            if (!this.config.enabled) {
                return;
            }
            // Clean expired entries periodically
            if (this.cache.size % 100 === 0) {
                this.cleanExpired();
            }
            this.evictIfNeeded();
            const key = this.generateCacheKey(methodName, args);
            const ttl = customTtl || this.config.ttl;
            const entry = {
                data,
                timestamp: Date.now(),
                ttl,
                key
            };
            this.cache.set(key, entry);
            this.updateAccessOrder(key);
            this.updateStats();
        }
        /**
         * Check if data exists in cache (and is not expired)
         * @param methodName - Method name
         * @param args - Method arguments
         * @returns True if cached data exists
         */
        has(methodName, args = []) {
            return this.get(methodName, args) !== null;
        }
        /**
         * Remove specific cache entry
         * @param methodName - Method name
         * @param args - Method arguments
         */
        delete(methodName, args = []) {
            if (!this.config.enabled) {
                return false;
            }
            const key = this.generateCacheKey(methodName, args);
            const deleted = this.cache.delete(key);
            if (deleted) {
                this.accessOrder.delete(key);
                this.updateStats();
            }
            return deleted;
        }
        /**
         * Flush cache for a specific method and arguments
         * @param methodName - Method name
         * @param args - Method arguments
         */
        flush(methodName, args = []) {
            this.delete(methodName, args);
        }
        /**
         * Clear all cache entries
         */
        clear() {
            this.cache.clear();
            this.accessOrder.clear();
            this.stats.hits = 0;
            this.stats.misses = 0;
            this.updateStats();
        }
        /**
         * Flush expired entries
         */
        flushExpired() {
            this.cleanExpired();
            this.updateStats();
        }
        /**
         * Clear cache entries by method name pattern
         * @param methodPattern - Method name pattern (regex string or exact match)
         */
        clearByMethod(methodPattern) {
            if (!this.config.enabled) {
                return 0;
            }
            const regex = new RegExp(methodPattern);
            const keysToDelete = [];
            for (const [key, entry] of this.cache) {
                // Extract method name from key
                const methodName = key.split('_').slice(-1)[0]; // Get last part after underscore
                if (regex.test(methodName)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => {
                this.cache.delete(key);
                this.accessOrder.delete(key);
            });
            this.updateStats();
            return keysToDelete.length;
        }
        /**
         * Get cache statistics
         * @returns Cache statistics
         */
        getStats() {
            this.updateStats();
            return { ...this.stats };
        }
        /**
         * Get cache configuration
         * @returns Cache configuration
         */
        getConfig() {
            return { ...this.config };
        }
        /**
         * Update cache configuration
         * @param newConfig - New configuration
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            this.stats.maxEntries = this.config.maxEntries;
            // If cache is disabled, clear everything
            if (!this.config.enabled) {
                this.clear();
            }
            // If max entries reduced, evict excess entries
            if (this.cache.size > this.config.maxEntries) {
                this.evictIfNeeded();
            }
        }
        /**
         * Get all cache entries (for debugging)
         * @returns Array of cache entries
         */
        getEntries() {
            return Array.from(this.cache.values());
        }
        /**
         * Get cache entries by method name
         * @param methodName - Method name to filter by
         * @returns Array of matching cache entries
         */
        getEntriesByMethod(methodName) {
            return Array.from(this.cache.values()).filter(entry => entry.key.includes(methodName));
        }
        /**
         * Enable cache
         */
        enable() {
            this.config.enabled = true;
        }
        /**
         * Disable cache and clear all entries
         */
        disable() {
            this.config.enabled = false;
            this.clear();
        }
        /**
         * Check if cache is enabled
         * @returns True if cache is enabled
         */
        isEnabled() {
            return this.config.enabled;
        }
    }

    /**
     * Generic JSON Schemas for WordPress REST API
     *
     * These schemas provide flexible, extensible definitions for:
     * - Custom post types (full and simplified versions)
     * - Custom taxonomy terms (full and simplified versions)
     * - Custom taxonomies (full and simplified versions)
     *
     * Full schemas handle complete WordPress REST API responses
     * Simplified schemas focus on content creation and user input
     */
    /**
     * JSON Schema definitions for validation
     */
    // Simplified JSON Schemas (for content creation)
    const WPSimplePostJSONSchema = {
        type: "object",
        properties: {
            title: { type: "string" },
            content: { type: "string" },
            excerpt: { type: "string" },
            slug: { type: "string" },
            status: {
                type: "string",
                enum: ["publish", "draft", "private", "pending"]
            },
            type: { type: "string" },
            parent: { type: "number" },
            menu_order: { type: "number" },
            taxonomies: {
                type: "object",
                additionalProperties: {
                    type: "array",
                    items: {
                        oneOf: [
                            { type: "number" },
                            { type: "string" }
                        ]
                    }
                }
            },
            categories: {
                type: "array",
                items: {
                    oneOf: [
                        { type: "number" },
                        { type: "string" }
                    ]
                }
            },
            tags: {
                type: "array",
                items: {
                    oneOf: [
                        { type: "number" },
                        { type: "string" }
                    ]
                }
            },
            meta: { type: "object" },
            acf: { type: "object" }
        },
        required: ["title", "type"],
        additionalProperties: true
    };
    const WPSimpleTermJSONSchema = {
        type: "object",
        properties: {
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            taxonomy: { type: "string" },
            parent: { type: "number" },
            meta: { type: "object" },
            acf: { type: "object" },
            color: { type: "string" },
            icon: { type: "string" },
            image: {
                oneOf: [
                    { type: "string" },
                    { type: "object" }
                ]
            }
        },
        required: ["name", "taxonomy"],
        additionalProperties: true
    };
    const WPSimpleTaxonomyJSONSchema = {
        type: "object",
        properties: {
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            types: { type: "array", items: { type: "string" } },
            hierarchical: { type: "boolean" },
            labels: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    singular_name: { type: "string" },
                    add_new_item: { type: "string" },
                    edit_item: { type: "string" }
                },
                required: ["name", "singular_name"],
                additionalProperties: { type: "string" }
            },
            public: { type: "boolean" },
            show_ui: { type: "boolean" },
            show_in_rest: { type: "boolean" },
            rewrite: {
                oneOf: [
                    { type: "object" },
                    { type: "boolean" }
                ]
            },
            custom_settings: { type: "object" }
        },
        required: ["name", "slug", "types", "labels"],
        additionalProperties: true
    };
    // Full JSON Schemas (for complete API responses)
    const WPGenericPostJSONSchema = {
        type: "object",
        properties: {
            id: { type: "number" },
            date: { type: "string", format: "date-time" },
            date_gmt: { type: "string", format: "date-time" },
            modified: { type: "string", format: "date-time" },
            modified_gmt: { type: "string", format: "date-time" },
            slug: { type: "string" },
            status: { type: "string" },
            type: { type: "string" },
            link: { type: "string", format: "uri" },
            title: {
                type: "object",
                properties: {
                    rendered: { type: "string" },
                    raw: { type: "string" },
                    protected: { type: "boolean" }
                },
                required: ["rendered"]
            },
            content: {
                type: "object",
                properties: {
                    rendered: { type: "string" },
                    raw: { type: "string" },
                    protected: { type: "boolean" },
                    block_version: { type: "number" }
                },
                required: ["rendered", "protected"]
            },
            excerpt: {
                type: "object",
                properties: {
                    rendered: { type: "string" },
                    raw: { type: "string" },
                    protected: { type: "boolean" }
                },
                required: ["rendered", "protected"]
            },
            guid: {
                type: "object",
                properties: {
                    rendered: { type: "string" },
                    raw: { type: "string" }
                },
                required: ["rendered"]
            },
            author: { type: "number" },
            featured_media: { type: "number" },
            comment_status: { type: "string", enum: ["open", "closed"] },
            ping_status: { type: "string", enum: ["open", "closed"] },
            sticky: { type: "boolean" },
            template: { type: "string" },
            format: { type: "string" },
            parent: { type: "number" },
            menu_order: { type: "number" },
            taxonomies: {
                type: "object",
                additionalProperties: {
                    oneOf: [
                        { type: "array", items: { type: "number" } },
                        { type: "array", items: { type: "string" } },
                        { type: "array", items: { type: "object" } }
                    ]
                }
            },
            categories: { type: "array", items: { type: "number" } },
            tags: { type: "array", items: { type: "number" } },
            meta: { type: "object" },
            acf: { type: "object" },
            custom_fields: { type: "object" },
            _links: { type: "object" },
            _embedded: { type: "object" }
        },
        required: [
            "id", "date", "date_gmt", "modified", "modified_gmt",
            "slug", "status", "type", "link", "title", "content",
            "excerpt", "guid", "author", "featured_media",
            "comment_status", "ping_status"
        ],
        additionalProperties: true
    };
    const WPGenericTermJSONSchema = {
        type: "object",
        properties: {
            id: { type: "number" },
            count: { type: "number" },
            description: { type: "string" },
            link: { type: "string", format: "uri" },
            name: { type: "string" },
            slug: { type: "string" },
            taxonomy: { type: "string" },
            parent: { type: "number" },
            meta: { type: "object" },
            acf: { type: "object" },
            custom_fields: { type: "object" },
            color: { type: "string" },
            icon: { type: "string" },
            image: {
                oneOf: [
                    { type: "string" },
                    { type: "object" }
                ]
            },
            children: {
                type: "array",
                items: { $ref: "#/definitions/WPGenericTermSchema" }
            },
            ancestors: { type: "array", items: { type: "number" } },
            _links: { type: "object" }
        },
        required: [
            "id", "count", "description", "link", "name", "slug", "taxonomy", "parent"
        ],
        additionalProperties: true
    };
    const WPGenericTaxonomyJSONSchema = {
        type: "object",
        properties: {
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            types: { type: "array", items: { type: "string" } },
            hierarchical: { type: "boolean" },
            rest_base: { type: "string" },
            rest_controller_class: { type: "string" },
            rest_namespace: { type: "string" },
            labels: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    singular_name: { type: "string" }
                },
                required: ["name", "singular_name"],
                additionalProperties: { type: "string" }
            },
            capabilities: { type: "object" },
            public: { type: "boolean" },
            publicly_queryable: { type: "boolean" },
            show_ui: { type: "boolean" },
            show_in_menu: { type: "boolean" },
            show_in_nav_menus: { type: "boolean" },
            show_in_rest: { type: "boolean" },
            show_tagcloud: { type: "boolean" },
            show_in_quick_edit: { type: "boolean" },
            show_admin_column: { type: "boolean" },
            query_var: {
                oneOf: [
                    { type: "string" },
                    { type: "boolean" }
                ]
            },
            rewrite: {
                oneOf: [
                    { type: "object" },
                    { type: "boolean" }
                ]
            },
            default_term: { type: "object" },
            sort: { type: "boolean" },
            args: { type: "object" },
            meta_box_cb: {
                oneOf: [
                    { type: "string" },
                    { type: "boolean" }
                ]
            },
            meta_box_sanitize_cb: { type: "string" },
            custom_settings: { type: "object" },
            _links: { type: "object" }
        },
        required: [
            "name", "slug", "description", "types", "hierarchical",
            "rest_base", "rest_controller_class", "labels"
        ],
        additionalProperties: true
    };
    /**
     * Schema validation utilities
     */
    class WPSchemaValidator {
        /**
         * Validate a simple post object against the simplified schema
         * @param post - Post object to validate
         * @returns Validation result
         */
        static validateSimplePost(post) {
            const errors = [];
            const warnings = [];
            // Check required fields
            if (!post.title || typeof post.title !== "string") {
                errors.push("Field 'title' is required and must be a string");
            }
            if (!post.type || typeof post.type !== "string") {
                errors.push("Field 'type' is required and must be a string");
            }
            // Check optional field types
            if (post.content !== undefined && typeof post.content !== "string") {
                errors.push("Field 'content' must be a string");
            }
            if (post.excerpt !== undefined && typeof post.excerpt !== "string") {
                errors.push("Field 'excerpt' must be a string");
            }
            if (post.slug !== undefined && typeof post.slug !== "string") {
                errors.push("Field 'slug' must be a string");
            }
            if (post.status !== undefined && !["publish", "draft", "private", "pending"].includes(post.status)) {
                warnings.push("Field 'status' should be one of: publish, draft, private, pending");
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
        }
        /**
         * Validate a simple term object against the simplified schema
         * @param term - Term object to validate
         * @returns Validation result
         */
        static validateSimpleTerm(term) {
            const errors = [];
            const warnings = [];
            // Check required fields
            if (!term.name || typeof term.name !== "string") {
                errors.push("Field 'name' is required and must be a string");
            }
            if (!term.taxonomy || typeof term.taxonomy !== "string") {
                errors.push("Field 'taxonomy' is required and must be a string");
            }
            // Check optional field types
            if (term.slug !== undefined && typeof term.slug !== "string") {
                errors.push("Field 'slug' must be a string");
            }
            if (term.description !== undefined && typeof term.description !== "string") {
                errors.push("Field 'description' must be a string");
            }
            if (term.parent !== undefined && typeof term.parent !== "number") {
                errors.push("Field 'parent' must be a number");
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
        }
        /**
         * Validate a simple taxonomy object against the simplified schema
         * @param taxonomy - Taxonomy object to validate
         * @returns Validation result
         */
        static validateSimpleTaxonomy(taxonomy) {
            const errors = [];
            const warnings = [];
            // Check required fields
            if (!taxonomy.name || typeof taxonomy.name !== "string") {
                errors.push("Field 'name' is required and must be a string");
            }
            if (!taxonomy.slug || typeof taxonomy.slug !== "string") {
                errors.push("Field 'slug' is required and must be a string");
            }
            if (!taxonomy.types || !Array.isArray(taxonomy.types)) {
                errors.push("Field 'types' is required and must be an array");
            }
            if (!taxonomy.labels || typeof taxonomy.labels !== "object") {
                errors.push("Field 'labels' is required and must be an object");
            }
            else {
                if (!taxonomy.labels.name) {
                    errors.push("Field 'labels.name' is required");
                }
                if (!taxonomy.labels.singular_name) {
                    errors.push("Field 'labels.singular_name' is required");
                }
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
        }
        /**
         * Validate a post object against the generic post schema
         * @param post - Post object to validate
         * @returns Validation result
         */
        static validatePost(post) {
            const errors = [];
            const warnings = [];
            // Check required fields
            const requiredFields = [
                "id", "date", "date_gmt", "modified", "modified_gmt",
                "slug", "status", "type", "link", "title", "content",
                "excerpt", "guid", "author", "featured_media",
                "comment_status", "ping_status"
            ];
            for (const field of requiredFields) {
                if (post[field] === undefined || post[field] === null) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
            // Check field types
            if (post.id !== undefined && typeof post.id !== "number") {
                errors.push("Field 'id' must be a number");
            }
            if (post.title && typeof post.title !== "object") {
                errors.push("Field 'title' must be an object");
            }
            if (post.title && !post.title.rendered) {
                errors.push("Field 'title.rendered' is required");
            }
            // Check for common issues
            if (post.meta && typeof post.meta !== "object") {
                warnings.push("Field 'meta' should be an object");
            }
            if (post.acf && typeof post.acf !== "object") {
                warnings.push("Field 'acf' should be an object");
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
        }
        /**
         * Validate a term object against the generic term schema
         * @param term - Term object to validate
         * @returns Validation result
         */
        static validateTerm(term) {
            const errors = [];
            const warnings = [];
            // Check required fields
            const requiredFields = [
                "id", "count", "description", "link", "name", "slug", "taxonomy", "parent"
            ];
            for (const field of requiredFields) {
                if (term[field] === undefined || term[field] === null) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
            // Check field types
            if (term.id !== undefined && typeof term.id !== "number") {
                errors.push("Field 'id' must be a number");
            }
            if (term.count !== undefined && typeof term.count !== "number") {
                errors.push("Field 'count' must be a number");
            }
            if (term.parent !== undefined && typeof term.parent !== "number") {
                errors.push("Field 'parent' must be a number");
            }
            // Check for common issues
            if (term.meta && typeof term.meta !== "object") {
                warnings.push("Field 'meta' should be an object");
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
        }
        /**
         * Validate a taxonomy object against the generic taxonomy schema
         * @param taxonomy - Taxonomy object to validate
         * @returns Validation result
         */
        static validateTaxonomy(taxonomy) {
            const errors = [];
            const warnings = [];
            // Check required fields
            const requiredFields = [
                "name", "slug", "description", "types", "hierarchical",
                "rest_base", "rest_controller_class", "labels"
            ];
            for (const field of requiredFields) {
                if (taxonomy[field] === undefined || taxonomy[field] === null) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
            // Check field types
            if (taxonomy.hierarchical !== undefined && typeof taxonomy.hierarchical !== "boolean") {
                errors.push("Field 'hierarchical' must be a boolean");
            }
            if (taxonomy.types && !Array.isArray(taxonomy.types)) {
                errors.push("Field 'types' must be an array");
            }
            if (taxonomy.labels && typeof taxonomy.labels !== "object") {
                errors.push("Field 'labels' must be an object");
            }
            if (taxonomy.labels && !taxonomy.labels.name) {
                errors.push("Field 'labels.name' is required");
            }
            if (taxonomy.labels && !taxonomy.labels.singular_name) {
                errors.push("Field 'labels.singular_name' is required");
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
        }
        /**
         * Convert simple post to WordPress API format
         * @param simplePost - Simple post object
         * @returns Post in WordPress API format
         */
        static convertSimplePostToWordPress(simplePost) {
            return {
                title: {
                    rendered: simplePost.title,
                    raw: simplePost.title,
                    protected: false
                },
                content: {
                    rendered: simplePost.content || "",
                    raw: simplePost.content || "",
                    protected: false
                },
                excerpt: {
                    rendered: simplePost.excerpt || "",
                    raw: simplePost.excerpt || "",
                    protected: false
                },
                slug: simplePost.slug || "",
                status: simplePost.status || "draft",
                type: simplePost.type,
                parent: simplePost.parent || 0,
                menu_order: simplePost.menu_order || 0,
                meta: simplePost.meta || {},
                acf: simplePost.acf || {},
                taxonomies: simplePost.taxonomies || {},
                categories: Array.isArray(simplePost.categories)
                    ? simplePost.categories.map(cat => typeof cat === 'string' ? parseInt(cat, 10) : cat).filter(id => !isNaN(id))
                    : [],
                tags: Array.isArray(simplePost.tags)
                    ? simplePost.tags.map(tag => typeof tag === 'string' ? parseInt(tag, 10) : tag).filter(id => !isNaN(id))
                    : [],
                // Default WordPress API fields
                author: 1,
                featured_media: 0,
                comment_status: "open",
                ping_status: "open"
            };
        }
        /**
         * Convert WordPress API post to simple format
         * @param wordpressPost - WordPress API post object
         * @returns Simple post object
         */
        static convertWordPressPostToSimple(wordpressPost) {
            // Convert taxonomies to simple format (extract IDs if they're objects)
            const simpleTaxonomies = {};
            if (wordpressPost.taxonomies) {
                for (const [taxonomy, terms] of Object.entries(wordpressPost.taxonomies)) {
                    if (Array.isArray(terms)) {
                        if (terms.length > 0 && typeof terms[0] === 'object') {
                            // Convert objects to IDs
                            simpleTaxonomies[taxonomy] = terms.map((term) => term.id || term.slug).filter(Boolean);
                        }
                        else {
                            // Already in simple format
                            simpleTaxonomies[taxonomy] = terms;
                        }
                    }
                }
            }
            return {
                title: wordpressPost.title.rendered,
                content: wordpressPost.content.rendered,
                excerpt: wordpressPost.excerpt.rendered,
                slug: wordpressPost.slug,
                status: wordpressPost.status,
                type: wordpressPost.type,
                parent: wordpressPost.parent,
                menu_order: wordpressPost.menu_order,
                meta: wordpressPost.meta,
                acf: wordpressPost.acf,
                taxonomies: simpleTaxonomies,
                ...(wordpressPost.categories && { categories: wordpressPost.categories }),
                ...(wordpressPost.tags && { tags: wordpressPost.tags })
            };
        }
        /**
         * Normalize a post object to match the generic schema
         * @param post - Post object to normalize
         * @returns Normalized post object
         */
        static normalizePost(post) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            const normalized = {
                id: post.id || 0,
                date: post.date || "",
                date_gmt: post.date_gmt || "",
                modified: post.modified || "",
                modified_gmt: post.modified_gmt || "",
                slug: post.slug || "",
                status: post.status || "publish",
                type: post.type || "post",
                link: post.link || "",
                title: {
                    rendered: ((_a = post.title) === null || _a === void 0 ? void 0 : _a.rendered) || post.title || "",
                    raw: (_b = post.title) === null || _b === void 0 ? void 0 : _b.raw,
                    protected: ((_c = post.title) === null || _c === void 0 ? void 0 : _c.protected) || false
                },
                content: {
                    rendered: ((_d = post.content) === null || _d === void 0 ? void 0 : _d.rendered) || post.content || "",
                    raw: (_e = post.content) === null || _e === void 0 ? void 0 : _e.raw,
                    protected: ((_f = post.content) === null || _f === void 0 ? void 0 : _f.protected) || false,
                    block_version: (_g = post.content) === null || _g === void 0 ? void 0 : _g.block_version
                },
                excerpt: {
                    rendered: ((_h = post.excerpt) === null || _h === void 0 ? void 0 : _h.rendered) || post.excerpt || "",
                    raw: (_j = post.excerpt) === null || _j === void 0 ? void 0 : _j.raw,
                    protected: ((_k = post.excerpt) === null || _k === void 0 ? void 0 : _k.protected) || false
                },
                guid: {
                    rendered: ((_l = post.guid) === null || _l === void 0 ? void 0 : _l.rendered) || post.guid || "",
                    raw: (_m = post.guid) === null || _m === void 0 ? void 0 : _m.raw
                },
                author: post.author || 0,
                featured_media: post.featured_media || 0,
                comment_status: post.comment_status || "open",
                ping_status: post.ping_status || "open",
                ...post
            };
            return normalized;
        }
        /**
         * Normalize a term object to match the generic schema
         * @param term - Term object to normalize
         * @returns Normalized term object
         */
        static normalizeTerm(term) {
            const normalized = {
                id: term.id || 0,
                count: term.count || 0,
                description: term.description || "",
                link: term.link || "",
                name: term.name || "",
                slug: term.slug || "",
                taxonomy: term.taxonomy || "",
                parent: term.parent || 0,
                ...term
            };
            return normalized;
        }
        /**
         * Normalize a taxonomy object to match the generic schema
         * @param taxonomy - Taxonomy object to normalize
         * @returns Normalized taxonomy object
         */
        static normalizeTaxonomy(taxonomy) {
            var _a, _b;
            const normalized = {
                name: taxonomy.name || "",
                slug: taxonomy.slug || "",
                description: taxonomy.description || "",
                types: taxonomy.types || [],
                hierarchical: taxonomy.hierarchical || false,
                rest_base: taxonomy.rest_base || "",
                rest_controller_class: taxonomy.rest_controller_class || "",
                labels: {
                    name: ((_a = taxonomy.labels) === null || _a === void 0 ? void 0 : _a.name) || "",
                    singular_name: ((_b = taxonomy.labels) === null || _b === void 0 ? void 0 : _b.singular_name) || "",
                    ...taxonomy.labels
                },
                ...taxonomy
            };
            return normalized;
        }
    }

    // Core exports
    // Environment detection utilities (simple checks)
    const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';
    // Convenience function for quick setup
    function createWordPressClient(baseUrl, cache) {
        return new WordPress({
            baseUrl,
            cache
        });
    }
    // Convenience function with authentication
    function createWordPressClientWithAuth(baseUrl, username, password, cache) {
        return new WordPress({
            baseUrl,
            auth: { username, password },
            cache
        });
    }
    // Convenience function with token
    function createWordPressClientWithToken(baseUrl, token, cache) {
        return new WordPress({
            baseUrl,
            auth: { token },
            cache
        });
    }
    // Enhanced convenience function with environment-aware defaults
    function createWordPressClientWithDefaults(baseUrl, options = {}) {
        return new WordPress({
            baseUrl,
            auth: options.auth,
            cache: options.cache
        });
    }

    exports.POST_TYPE_MAPPINGS = POST_TYPE_MAPPINGS;
    exports.STORE_API_NAMESPACE = STORE_API_NAMESPACE;
    exports.STORE_TERM_ENDPOINTS = STORE_TERM_ENDPOINTS;
    exports.TAXONOMY_MAPPINGS = TAXONOMY_MAPPINGS;
    exports.WPCache = WPCache;
    exports.WPClient = WPClient;
    exports.WPGenericPostJSONSchema = WPGenericPostJSONSchema;
    exports.WPGenericTaxonomyJSONSchema = WPGenericTaxonomyJSONSchema;
    exports.WPGenericTermJSONSchema = WPGenericTermJSONSchema;
    exports.WPMenusAPI = WPMenusAPI;
    exports.WPMetaAPI = WPMetaAPI;
    exports.WPPostsAPI = WPPostsAPI;
    exports.WPSchemaValidator = WPSchemaValidator;
    exports.WPSimplePostJSONSchema = WPSimplePostJSONSchema;
    exports.WPSimpleTaxonomyJSONSchema = WPSimpleTaxonomyJSONSchema;
    exports.WPSimpleTermJSONSchema = WPSimpleTermJSONSchema;
    exports.WPTaxonomiesAPI = WPTaxonomiesAPI;
    exports.WordPress = WordPress;
    exports.createWordPressClient = createWordPressClient;
    exports.createWordPressClientWithAuth = createWordPressClientWithAuth;
    exports.createWordPressClientWithDefaults = createWordPressClientWithDefaults;
    exports.createWordPressClientWithToken = createWordPressClientWithToken;
    exports.fetchShopBreadcrumbs = fetchShopBreadcrumbs;
    exports.fetchStoreApiProducts = fetchStoreApiProducts;
    exports.fetchStoreApiTerms = fetchStoreApiTerms;
    exports.getAllPostTypeMappings = getAllPostTypeMappings;
    exports.getAllTaxonomyMappings = getAllTaxonomyMappings;
    exports.getPostTypeFromQuery = getPostTypeFromQuery;
    exports.getStoreTermEndpoint = getStoreTermEndpoint;
    exports.getTaxonomyFromQuery = getTaxonomyFromQuery;
    exports.hasPostTypeMapping = hasPostTypeMapping;
    exports.hasTaxonomyMapping = hasTaxonomyMapping;
    exports.isBrowser = isBrowser;
    exports.mapPostTypeToEndpoint = mapPostTypeToEndpoint;
    exports.mapTaxonomyToEndpoint = mapTaxonomyToEndpoint;
    exports.registerPostTypeMapping = registerPostTypeMapping;
    exports.registerTaxonomyMapping = registerTaxonomyMapping;
    exports.wpQueryToRest = wpQueryToRest;
    exports.wpTermQueryToRest = wpTermQueryToRest;

}));
