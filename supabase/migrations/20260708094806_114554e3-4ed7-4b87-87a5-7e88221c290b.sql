-- Restrict exposure of internal identifiers on product_reviews
REVOKE SELECT (user_id, order_id) ON public.product_reviews FROM anon;
REVOKE SELECT (user_id, order_id) ON public.product_reviews FROM authenticated;

-- Remove unused anon INSERT grant on back_in_stock_subscriptions (no policy permits it anyway; writes go via service role)
REVOKE INSERT ON public.back_in_stock_subscriptions FROM anon;