import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout.jsx';
import { RequireAuth } from './guards.jsx';
import { Spinner } from '@/components/ui/index.jsx';
import NotFound from '@/pages/NotFound.jsx';

const L = (f) => lazy(f);
const Home = L(() => import('@/pages/Home.jsx')); const Shop = L(() => import('@/pages/Shop.jsx')); const Product = L(() => import('@/pages/Product.jsx'));
const Search = L(() => import('@/pages/Search.jsx')); const Brands = L(() => import('@/pages/Brands.jsx')); const ScentFinder = L(() => import('@/pages/ScentFinder.jsx'));
const Cart = L(() => import('@/pages/Cart.jsx')); const Checkout = L(() => import('@/pages/Checkout.jsx')); const Callback = L(() => import('@/pages/CheckoutCallback.jsx'));
const auth = (n) => L(() => import('@/pages/auth/AuthPages.jsx').then((m) => ({ default: m[n] })));
const Login = auth('Login'); const Register = auth('Register'); const Forgot = auth('ForgotPassword'); const Reset = auth('ResetPassword');
const acct = (n) => L(() => import('@/pages/account/Account.jsx').then((m) => ({ default: m[n] })));
const AccountLayout = acct('AccountLayout'); const AccountHome = acct('AccountHome'); const AccountOrders = acct('AccountOrders'); const AccountWishlist = acct('AccountWishlist'); const AccountAddresses = acct('AccountAddresses'); const AccountProfile = acct('AccountProfile');
const st = (n) => L(() => import('@/pages/Static.jsx').then((m) => ({ default: m[n] })));
const About = st('About'); const Contact = st('Contact'); const Faq = st('Faq'); const Shipping = st('Shipping'); const Returns = st('Returns'); const Privacy = st('Privacy'); const Terms = st('Terms');
const AdminLayout = L(() => import('@/layouts/AdminLayout.jsx')); const Dashboard = L(() => import('@/pages/admin/Dashboard.jsx'));
const AdminProducts = L(() => import('@/pages/admin/Products.jsx')); const ProductEditor = L(() => import('@/pages/admin/ProductEditor.jsx'));
const ord = (n) => L(() => import('@/pages/admin/Orders.jsx').then((m) => ({ default: m[n] }))); const AdminOrders = ord('AdminOrders'); const AdminOrderDetail = ord('AdminOrderDetail');
const mis = (n) => L(() => import('@/pages/admin/Misc.jsx').then((m) => ({ default: m[n] })));
const AdminCustomers = mis('AdminCustomers'); const AdminCustomerDetail = mis('AdminCustomerDetail'); const AdminReviews = mis('AdminReviews'); const AdminSupport = mis('AdminSupport'); const AdminTicket = mis('AdminTicket'); const AdminAnalytics = mis('AdminAnalytics');
const AdminSettings = L(() => import('@/pages/admin/Settings.jsx'));

const Fallback = () => <div className="grid min-h-[50dvh] place-items-center"><Spinner className="size-8" /></div>;

export default function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} /><Route path="shop/:category" element={<Shop />} />
          <Route path="brands" element={<Brands />} /><Route path="brands/:slug" element={<Shop mode="brand" />} />
          <Route path="fragrance-families/:slug" element={<Shop mode="family" />} />
          <Route path="product/:slug" element={<Product />} /><Route path="search" element={<Search />} />
          <Route path="scent-finder" element={<ScentFinder />} />
          <Route path="cart" element={<Cart />} /><Route path="checkout" element={<Checkout />} /><Route path="checkout/callback" element={<Callback />} />
          <Route path="login" element={<Login />} /><Route path="register" element={<Register />} /><Route path="forgot-password" element={<Forgot />} /><Route path="reset-password" element={<Reset />} />
          <Route path="about" element={<About />} /><Route path="contact" element={<Contact />} /><Route path="faq" element={<Faq />} />
          <Route path="shipping" element={<Shipping />} /><Route path="returns" element={<Returns />} /><Route path="privacy" element={<Privacy />} /><Route path="terms" element={<Terms />} />
          <Route element={<RequireAuth />}>
            <Route path="account" element={<AccountLayout />}><Route index element={<AccountHome />} /><Route path="orders" element={<AccountOrders />} /><Route path="wishlist" element={<AccountWishlist />} /><Route path="addresses" element={<AccountAddresses />} /><Route path="profile" element={<AccountProfile />} /></Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<RequireAuth staff />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} /><Route path="products" element={<AdminProducts />} /><Route path="products/:id" element={<ProductEditor />} />
            <Route path="orders" element={<AdminOrders />} /><Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="customers" element={<AdminCustomers />} /><Route path="customers/:id" element={<AdminCustomerDetail />} />
            <Route path="reviews" element={<AdminReviews />} /><Route path="support" element={<AdminSupport />} /><Route path="support/:id" element={<AdminTicket />} />
            <Route path="analytics" element={<AdminAnalytics />} /><Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
