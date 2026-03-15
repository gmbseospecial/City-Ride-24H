window["WPCache"] = new WvcUtils.WPCache();

if (window["WVCMenus"]) {
  window["WVCMenus"]["menusDetailed"].forEach((menu) => {
    window["WPCache"].set(
      `getWithNamespace_wvc/v1_menus/${menu.id}`,
      [`menus/${menu.id}`, {}, "wvc/v1"],
      { data: menu, headers: { wvc_localized: true }, status: 200 }
    );
  });
  console.log(window["WPCache"]);
}
window["WPClient"] = WvcUtils.createWordPressClient(
  window["WVC"].homeUrl,
  window["WPCache"]
);

class WvcClient {
  async getMenuItems({ menuId } = {}) {
    const menu_items_data = await window["WPClient"].get_menu_items(menuId);
    return menu_items_data?.data ?? [];
  }

  getCurrentPostID() {
    return window["WVC"].postId;
  }
  getCurrentTermID() {
    return window["WVC"].termId;
  }

  getCurrentWPQuery(){

    return window["WVC"].wpQuery;
  }

  getCurrentPostType() {
    return window["WVC"].postType || "post";
  }
  getCurrentTaxonomy() {
    return window["WVC"].taxonomy;
  }

  async getPosts(postParams = {}, postType = "post") {
    const wpQueryParams = postParams?.wp_query ?? {};
    const params = {
      ...wpQueryParams,
      _fields: postParams?.fields,
      _embed: postParams?.embeds ?? [],
    };
    let maybePostType = postParams?.postType ?? "";
    if (maybePostType && postType === "post") {
      postType = maybePostType;
    }

    // Always call get_posts and let it handle routing to get_items for custom post types
    // do not skip flush cache param false
    const post_data = await window["WPClient"].get_posts(params, false, postType)
      

    return {
      posts: post_data?.data,
      total: post_data?.headers["x-wp-total"],
      total_pages: post_data?.headers["x-wp-totalpages"],
    };
  }

  async getTerms(termParams = {}) {
    const wpTermQueryParams = termParams?.wp_term_query ?? {};
    const params = {
      ...wpTermQueryParams,
      _fields: termParams?.fields,
      _embed: termParams?.embeds ?? [],
      taxonomy: termParams?.taxonomy,
    };

    const terms_data = await window["WPClient"].get_terms(params);

    return {
      terms: terms_data?.data,
      total: terms_data?.headers["x-wp-total"],
      total_pages: terms_data?.headers["x-wp-totalpages"],
    };
  }

  async get_wp_query_results(query = {}, params = {}, cache = false) {
    const post_data = await window["WPClient"].rest_wp_query(query, params, cache);

    return {
      posts: post_data?.data,
      total: post_data?.headers["x-wp-total"],
      total_pages: post_data?.headers["x-wp-totalpages"],
    };
  }

  async get_wp_term_query_results(query = {}, params = {}, cache = false) {
    const terms_data = await window["WPClient"].rest_wp_term_query(query, params, cache);

    return {
      terms: terms_data?.data,
      total: terms_data?.headers["x-wp-total"],
      total_pages: terms_data?.headers["x-wp-totalpages"],
    };
  }

  getCurrentWPQueryParams() {
    return window["WVC"].wpQueryParams || {};
  }

  getCurrentWPTermQueryParams() {
    return window["WVC"].wpTermQueryParams || {};
  }

  get_allowed_taxonomies(post_type = "post") {
    if (!post_type || !window["WVC"]?.allowedTaxonomies) {
      return [];
    }
    const taxonomies = window["WVC"].allowedTaxonomies[post_type];
    return Array.isArray(taxonomies) ? taxonomies : [];
  }

  get_allowed_meta(post_type = "post"){
    if (!post_type || !window["WVC"]?.allowedMeta) {
      return [];
    }
    const meta = window["WVC"].allowedMeta[post_type];
    return Array.isArray(meta) ? meta : [];
  }

  async get_breadcrumbs(cache = false) {
    const wp_query_params = window["WVC"].wpQueryParams || {};
    const wp_term_params = window["WVC"].wpTermQueryParams || {};
    const result = await window["WPClient"].rest_shop_breadcrumbs(
      wp_query_params,
      wp_term_params,
      cache
    );
    const breadcrumbs = Array.isArray(result?.data)
      ? result.data
      : (Array.isArray(result) ? result : []);

    const shopPage = window["WVC"].shopPage || {};
    const hasValidShopPageId =
      shopPage.id != null &&
      Number(shopPage.id) !== 0;

    const shopItem = hasValidShopPageId
      ? {
          link: shopPage.link || "#",
          title: shopPage.title || "Shop",
        }
      : {
          link: "#",
          title: "Shop",
        };

    const withShop = [shopItem, ...breadcrumbs];

    return result?.data != null ? { ...result, data: withShop } : withShop;
  }

  async formSubmission({
    // Required fields
    sectionName,
    formId,
    formData,

    // Optional metadata
    validationErrors = null,
    submissionAttempt = 1,
    formVersion = "1.0.0",
    ...rest
  } = {}) {
    if (!sectionName || !formId || !formData) {
      throw new Error(
        "Required fields missing: sectionName, formId, and formData are required"
      );
    }

    // console.log("Submitting form:", {
    //   sectionName,
    //   formId,
    //   formData,
    //   validationErrors,
    //   submissionAttempt,
    //   formVersion,
    //   ...rest,
    // });

    // Auto-generated fields
    const timestamp = Date.now();
    const sessionId = this.generateSessionId();
    const pageUrl = window.location.href;
    const userAgent = navigator.userAgent;

    // Prepare the submission data
    const submissionData = new FormData();

    // Add all form field values
    if (formData instanceof FormData) {
      for (const [key, value] of formData.entries()) {
        submissionData.append(`formData[${key}]`, value);
      }
    } else {
      // Handle object format
      for (const [key, value] of Object.entries(formData)) {
        // console.log("Appending form field:", key, value);

        submissionData.append(`formData[${key}]`, value);
      }
    }

    // Add metadata
    submissionData.append("sectionName", sectionName);
    submissionData.append("formId", formId);
    submissionData.append("timestamp", timestamp.toString());
    submissionData.append("sessionId", sessionId);
    submissionData.append("pageUrl", pageUrl);
    submissionData.append("userAgent", userAgent);
    submissionData.append("submissionAttempt", submissionAttempt.toString());
    submissionData.append("formVersion", formVersion);

    if (validationErrors) {
      submissionData.append(
        "validationErrors",
        JSON.stringify(validationErrors)
      );
    }

    // Add AJAX action and nonce for security
    if (window.wvcHandlerData && window.wvcHandlerData.nonce) {
      console.log("wvcHandlerData:", window.wvcHandlerData);

      submissionData.append("action", window.wvcHandlerData.action); // AJAX action
      submissionData.append("nonce", window.wvcHandlerData.nonce);
    } else {
      console.error("wvcHandlerData or nonce not found");
    }

    // console.log("Submission data prepared:", submissionData, formData);
    // alert("Handling form submission is working well so far!");

    try {
      const response = await fetch(window.wvcHandlerData.ajaxUrl, {
        method: "POST",
        body: submissionData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Handle WordPress AJAX response format
      if (result.success) {
        return result.data; // Return the actual data
      } else {
        throw new Error(result.data.message || "Form submission failed");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      throw error;
    }
  }

  generateSessionId() {
    // Check if session ID already exists
    let sessionId = sessionStorage.getItem("wvc_session_id");

    if (!sessionId) {
      // Generate a new session ID
      sessionId =
        "wvc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("wvc_session_id", sessionId);
    }

    // console.log("Generated/Retrieved session ID:", sessionId);
    return sessionId;
  }

  cart = {
    addToCart: async (item) => {
      console.log(item);

      // Validate input
      if (!item) {
        return {
          success: false,
          message: "Item parameter is required",
        };
      }

      const { id, quantity = 1 } = item;

      // Validate product_id
      if (!id || id === "undefined" || isNaN(id) || id <= 0) {
        return {
          success: false,
          message: `Invalid product id: ${id}. Must be a positive integer.`,
        };
      }

      // Validate quantity
      if (isNaN(quantity) || quantity <= 0) {
        return {
          success: false,
          message: `Invalid quantity: ${quantity}. Must be a positive integer.`,
        };
      }

      console.log("Adding to Cart:", { id, quantity });

      const formData = new FormData();
      formData.append("product_id", id.toString());
      formData.append("quantity", quantity.toString());
      formData.append("action", "wvc_cart_add");

      if (window.wvcHandlerData && window.wvcHandlerData.nonce) {
        formData.append("nonce", window.wvcHandlerData.nonce);
      } else {
        return {
          success: false,
          message: "wvcHandlerData or nonce not available",
        };
      }

      try {
        const response = await fetch(window.wvcHandlerData.ajaxUrl, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        // WordPress always returns success=true in the outer wrapper
        // Check the inner success field for actual operation status
        if (result.success && result.data.success) {
          console.log("Successfully added to cart:", result.data);
          return {
            success: true,
            message: result.data.message || "Item added to cart successfully",
            data: result.data.data,
          };
        } else if (result.success && result.data.success === false) {
          // Operation failed but response was received successfully
          console.error("Add to cart failed:", result.data.message);
          return {
            success: false,
            message: result.data.message || "Add to cart failed",
          };
        } else {
          // Unexpected response format
          console.error("Unexpected response format:", result);
          return {
            success: false,
            message: "Unexpected server response",
          };
        }
      } catch (error) {
        // Handle network or parsing errors
        console.error("Add to cart error:", error);
        return {
          success: false,
          message: `Network error: ${error.message}`,
        };
      }
    },

    currentState: async () => {
      const formData = new FormData();
      formData.append("action", "wvc_cart_get");

      if (window.wvcHandlerData && window.wvcHandlerData.nonce) {
        formData.append("nonce", window.wvcHandlerData.nonce);
      }

      try {
        const response = await fetch(window.wvcHandlerData.ajaxUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          return result.data;
        } else {
          throw new Error(result.data.message || "Get cart state failed");
        }
      } catch (error) {
        console.error("Get cart state error:", error);
        return [];
      }
    },

    removeFromCart: async (id) => {
      const formData = new FormData();
      formData.append("cart_item_key", id);
      formData.append("action", "wvc_cart_remove");

      if (window.wvcHandlerData && window.wvcHandlerData.nonce) {
        formData.append("nonce", window.wvcHandlerData.nonce);
      }

      try {
        const response = await fetch(window.wvcHandlerData.ajaxUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          return result.data;
        } else {
          throw new Error(result.data.message || "Remove from cart failed");
        }
      } catch (error) {
        console.error("Remove from cart error:", error);
        throw error;
      }
    },

    // NEW: Get WooCommerce URLs
    getUrls: () => ({
      cart: window.wvcHandlerData?.woocommerce?.cartUrl || "/cart",
      checkout: window.wvcHandlerData?.woocommerce?.checkoutUrl || "/checkout",
    }),

    // NEW: Navigate to cart
    goToCart: () => {
      const cartUrl = window.wvcHandlerData?.woocommerce?.cartUrl;
      if (cartUrl) {
        window.location.href = cartUrl;
      } else {
        console.error(
          "Cart URL not available. WooCommerce may not be configured."
        );
      }
    },

    // NEW: Navigate to checkout
    goToCheckout: () => {
      const checkoutUrl = window.wvcHandlerData?.woocommerce?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        console.error(
          "Checkout URL not available. WooCommerce may not be configured."
        );
      }
    },
  };
}

window.wvcClient = new WvcClient();

// WordPress Admin Bar positioning handler
(function () {
  let processedElements = new WeakSet();

  function handleAdminBarPositioning() {
    const adminBar = document.getElementById("wpadminbar");

    if (!adminBar) {
      return;
    }

    // Check if admin bar is visible (not display: none)
    const computedStyle = window.getComputedStyle(adminBar);
    const isVisible =
      computedStyle.display !== "none" && computedStyle.visibility !== "hidden";

    if (!isVisible || !adminBar.offsetHeight) {
      return;
    }

    const adminBarHeight = adminBar.offsetHeight;

    // Find all elements with fixed/sticky positioning and top < admin bar height
    const fixedElements = document.querySelectorAll("*");
    const elementsToAdjust = [];

    fixedElements.forEach((element) => {
      // Skip the admin bar itself and already processed elements
      if (element.id === "wpadminbar" || processedElements.has(element)) {
        return;
      }

      const computedStyle = window.getComputedStyle(element);
      const position = computedStyle.position;
      const top = computedStyle.top;

      if ((position === "fixed" || position === "sticky") && top !== "auto") {
        const topValue = parseFloat(top);
        if (!isNaN(topValue) && topValue < adminBarHeight) {
          elementsToAdjust.push({
            element: element,
            originalTop: topValue,
          });
        }
      }
    });

    // Adjust elements
    elementsToAdjust.forEach((item) => {
      const newTop = item.originalTop + adminBarHeight;
      item.element.style.top = newTop + "px";
      processedElements.add(item.element);
    });
  }

  // Function to continuously monitor for new elements
  function startMonitoring() {
    // Run immediately
    handleAdminBarPositioning();

    // Start observing after 1 second to ensure initial DOM is rendered
    setTimeout(() => {
      // Use MutationObserver to watch for new elements being added
      const observer = new MutationObserver(function (mutations) {
        let shouldCheck = false;
        mutations.forEach(function (mutation) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            shouldCheck = true;
          }
        });

        if (shouldCheck) {
          // Use requestAnimationFrame to ensure DOM is fully rendered
          requestAnimationFrame(handleAdminBarPositioning);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }, 1000);

    // Also run periodically to catch any missed elements
    setInterval(handleAdminBarPositioning, 1000);
  }

  // Start monitoring when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startMonitoring);
  } else {
    startMonitoring();
  }

  // Also run on window resize in case admin bar height changes
  window.addEventListener("resize", handleAdminBarPositioning);
})();
