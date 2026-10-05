import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://nwjmtnaqbiwhrmgimyqy.supabase.co";
const SUPABASE_KEY = "sb_publishable_6x3fyciQNza50vtKq1S53w_xsogvAJc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const scriptUrl = new URL(document.currentScript?.src || import.meta.url, location.href);
const requiredProduct = decodeURIComponent(scriptUrl.searchParams.get("product") || "").trim();

document.documentElement.style.visibility = "hidden";

const redirect = (path) => {
  const returnTo = location.pathname.split("/").pop() + location.search + location.hash;
  location.href = path + "?return=" + encodeURIComponent(returnTo);
};

const fail = (message) => {
  document.documentElement.style.visibility = "visible";
  document.body.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;background:#070707;color:#f7f7f8;font-family:Nunito,system-ui,sans-serif;padding:24px">
      <div style="width:min(440px,100%);padding:28px;border:1px solid #29292f;border-radius:24px;background:#111113;text-align:center">
        <div style="font:900 20px Raleway,system-ui,sans-serif;margin-bottom:10px">CUANIFY.</div>
        <div style="color:#f7f7f8;font-weight:800;margin-bottom:8px">${message}</div>
        <div style="color:#9999a2;font-size:12px;line-height:1.6">Kembali ke Member Area untuk melihat produk yang tersedia di akun kamu.</div>
        <a href="member-area.html" style="display:inline-block;margin-top:18px;padding:11px 15px;border-radius:12px;background:#8b5cf6;color:white;text-decoration:none;font-weight:900;font-size:12px">KE MEMBER AREA →</a>
      </div>
    </div>`;
};

try {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    redirect("login.html");
    throw new Error("not authenticated");
  }

  const { data: firstLogin, error: firstLoginError } = await supabase.rpc("get_my_first_login_state");
  if (firstLoginError) {
    fail("Status akun belum dapat diperiksa.");
    throw firstLoginError;
  }

  if (firstLogin?.required) {
    redirect("change-password.html");
    throw new Error("first login");
  }

  if (!requiredProduct) {
    document.documentElement.style.visibility = "visible";
  } else {
    const { data: access, error: accessError } = await supabase.rpc("get_my_product_access");
    if (accessError) {
      fail("Akses produk belum dapat diperiksa.");
      throw accessError;
    }

    const normalize = (value) => String(value || "").trim().toLowerCase();
    const allowed = (access || []).some(product => normalize(product.product_name) === normalize(requiredProduct));

    if (!allowed) {
      fail("Akun kamu belum memiliki akses ke produk ini.");
      throw new Error("product access denied");
    }

    document.documentElement.style.visibility = "visible";
  }
} catch (error) {
  console.warn("[CUANIFY member gate]", error?.message || error);
}
