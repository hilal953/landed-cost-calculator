'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './landing.css';

const POLICIES: Record<string, { title: string; body: string }> = {
  terms: {
    title: 'Terms of Service',
    body: `
      <h4>1. Agreement & License</h4>
      <p>By purchasing TrueLanded Pro ($9.00 one-time fee), you are granted a non-exclusive, perpetual license to access and use the web-based calculator for personal or commercial import calculations.</p>
      <h4>2. Product Delivery</h4>
      <p>This is a digital software product. Access is delivered immediately online upon successful payment via instant web app redirection and confirmation receipt email.</p>
      <h4>3. Merchant of Record</h4>
      <p>Our order process is conducted by our online reseller Lemon Squeezy. Lemon Squeezy is the Merchant of Record for all our orders. Lemon Squeezy provides customer service inquiries and handles returns.</p>
      <h4>4. Disclaimer</h4>
      <p>Calculations provided by TrueLanded are for estimating landed costs, shipping freight, and customs duties. Official customs assessments are subject to local customs authority regulations.</p>
    `
  },
  privacy: {
    title: 'Privacy Policy',
    body: `
      <h4>1. Confidentiality & Data Privacy</h4>
      <p>Your privacy is strictly protected. TrueLanded calculations run client-side in your web browser, and your shipments are saved only in your own browser's localStorage. We do not track, store, or sell your commercial invoices, supplier prices, product lists, or shipment numbers on our servers.</p>
      <h4>2. Optional AI Invoice Parsing</h4>
      <p>If you choose to use AI-powered photo/PDF parsing, that single document image is sent securely to our AI provider solely to extract line items, then discarded. Excel/paste parsing never leaves your browser. You can always use manual entry or Excel paste to keep everything 100% local.</p>
      <h4>3. Payment Information</h4>
      <p>All payment transactions are securely processed by Lemon Squeezy (our Merchant of Record) using industry-standard 256-bit encryption. We never store or have access to your credit card or billing details.</p>
      <h4>4. Local Storage</h4>
      <p>We use standard browser localStorage solely to save your calculations locally on your own device for your convenience.</p>
    `
  },
  refund: {
    title: 'Refund Policy (14-Day Money-Back Guarantee)',
    body: `
      <h4>14-Day Money-Back Guarantee</h4>
      <p>We offer a full 14-day money-back guarantee. If the calculator does not meet your expectations or save you time on your shipments, you can request a 100% refund within 14 days of purchase.</p>
      <h4>How to Request a Refund</h4>
      <p>To request a refund, simply email us at <a href="mailto:aadil.mohomed786@gmail.com" style="color: #E04D2D; font-weight: 700;">aadil.mohomed786@gmail.com</a> with your order receipt or email used at checkout. Refunds are processed within 2-3 business days via Lemon Squeezy.</p>
    `
  },
  contact: {
    title: 'Contact & Support',
    body: `
      <h4>Customer Support</h4>
      <p>For product support, billing inquiries, or feature requests, contact us directly:</p>
      <p style="margin: 14px 0;"><a href="mailto:aadil.mohomed786@gmail.com" style="color: #E04D2D; font-weight: 700; font-size: 16px; font-family: 'IBM Plex Mono', monospace;">aadil.mohomed786@gmail.com</a></p>
      <p style="font-size: 13px; color: #64748B;">Support is provided Monday through Saturday with prompt 24-hour response times.</p>
    `
  }
};

export default function LandingPage() {
  const [policyModal, setPolicyModal] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({});
  const [loginEmail, setLoginEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<{ msg: string; success?: boolean } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('landed_cost_user_email');
      if (saved) setLoginEmail(saved);
    }
  }, []);

  const toggleFaq = (idx: number) => {
    setOpenFaq(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleProLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim();
    if (!email) return;

    setLoginLoading(true);
    setLoginStatus({ msg: 'Checking license status...' });

    try {
      const res = await fetch('/api/verify?email=' + encodeURIComponent(email));
      const data = await res.json();

      if (!res.ok || !data.is_pro) {
        setLoginStatus({ msg: 'No Pro license found for this email. Please complete checkout first, then try again.' });
        setLoginLoading(false);
        return;
      }

      localStorage.setItem('landed_cost_pro_license', 'active');
      localStorage.setItem('landed_cost_pro_order', data.order_id || 'verified');
      localStorage.setItem('landed_cost_user_email', email);

      setLoginStatus({ msg: '✓ Pro License Verified! Redirecting to Pro manifest...', success: true });
      setTimeout(() => {
        window.location.href = '/pro';
      }, 600);
    } catch (err) {
      setLoginStatus({ msg: 'Could not verify license right now. Check your connection and try again.' });
      setLoginLoading(false);
      return;
    }
  };

  return (
    <>
      

<div className="lp-wrapper">
  {/*  Top Navigation  */}
  <header className="lp-nav">
    <div className="lp-nav-inner">
      <a href="#" className="lp-brand" aria-label="TrueLanded Home">
        <img src="/images/logo.svg" alt="TrueLanded" style={{"height":"30px","width":"auto","display":"block"}} />
      </a>
      <ul className="lp-nav-links">
        <li><a href="#how-it-works">How It Works</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#faq">FAQ</a></li>
      </ul>
      <div className="lp-nav-right">
        <button type="button" className="lp-btn-nav-login" onClick={() => {
          if (typeof window !== 'undefined' && localStorage.getItem('landed_cost_pro_license') === 'active') {
            window.location.href = '/pro';
            return;
          }
          setLoginModalOpen(true);
        }}>🔑 Log In</button>
        <a href="https://built-by-aadil.lemonsqueezy.com/checkout/buy/b789412f-3a44-4c06-a3f6-4dc36eb391d8?logo=0" className="lp-btn-nav-pro">Unlock Pro ($9)</a>
        <button className={`lp-menu-toggle ${mobileMenuOpen ? 'open' : ''}`} id="lpMenuToggle" aria-label="Toggle Navigation Menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>
    </div>
  </header>

  {/*  Mobile Drawer Dropdown Menu  */}
  <div className={`lp-mobile-backdrop ${mobileMenuOpen ? 'open' : ''}`} id="lpMobileBackdrop" onClick={() => setMobileMenuOpen(false)}></div>
  <nav className={`lp-mobile-menu ${mobileMenuOpen ? 'open' : ''}`} id="lpMobileMenu" aria-label="Mobile Navigation">
    <ul className="lp-mobile-nav-links">
      <li><a href="#how-it-works"><span className="nav-icon">💡</span> How It Works</a></li>
      <li><a href="#pricing"><span className="nav-icon">🏷️</span> Pricing ($9 One-Time)</a></li>
      <li><a href="#faq"><span className="nav-icon">❓</span> Common Questions</a></li>
    </ul>
    <a href="https://built-by-aadil.lemonsqueezy.com/checkout/buy/b789412f-3a44-4c06-a3f6-4dc36eb391d8?logo=0" className="lp-mobile-drawer-cta">🚀 Unlock Pro Lifetime Access ($9)</a>
  </nav>

  {/*  Hero Section  */}
  <section className="lp-hero">
    <div className="lp-container">
      <div className="lp-hero-pill">
        <span className="stars">★★★★★</span>
        <span>Built for Importers &amp; E-Com Sellers</span>
      </div>
            <h1>
        Know Your True Product Cost <br />
        <span className="highlight">Before You Pay Your Supplier</span>
      </h1>
      <p className="lp-hero-sub">
        Calculate exact shipping fees, customs duties, and taxes in seconds. Stop losing profit on hidden import costs.
      </p>
      <div className="lp-cta-wrap">
        <a href="https://built-by-aadil.lemonsqueezy.com/checkout/buy/b789412f-3a44-4c06-a3f6-4dc36eb391d8?logo=0" className="lp-btn-main">🚀 Stop Losing Profit ($9)</a>
        <a href="/free" className="lp-btn-secondary">⚡ Launch Free Calculator</a>
      </div>
      <p style={{"marginTop":"14px","fontSize":"13.5px","color":"#64748B","fontWeight":"500"}}>One-time payment. Lifetime access. 14-day money-back guarantee.</p>
      
      {/*  App Screenshot Demo  */}
      <div style={{"marginTop":"48px","borderRadius":"12px","overflow":"hidden","border":"1px solid #E2E8F0","boxShadow":"0 20px 40px -10px rgba(15, 23, 42, 0.1)","maxWidth":"900px","marginLeft":"auto","marginRight":"auto"}}>
        <picture>
          <source media="(max-width: 768px)" srcSet="/images/demo_mobile.jpeg" />
          <img src="/images/app_demo_1.png" alt="TrueLanded App Interface" style={{"width":"100%","display":"block"}} />
        </picture>
      </div>
    </div>
  </section>

  {/*  Zero-BS Visual Receipt Comparison (Michelangelo God-Tier Light Aesthetic)  */}
  <section id="how-it-works" style={{"background":"linear-gradient(180deg, #FAFBFC 0%, #F8FAFC 50%, #FFFFFF 100%)","padding":"90px 0 80px","borderTop":"1px solid #E2E8F0","borderBottom":"1px solid #E2E8F0","position":"relative","overflow":"hidden"}}>
    
    <div className="lp-container">
      
      {/*  Section Tag & Header  */}
      <div style={{"textAlign":"center","marginBottom":"52px","maxWidth":"680px","marginLeft":"auto","marginRight":"auto"}}>
        <div style={{"display":"inline-flex","alignItems":"center","gap":"6px","background":"#FFF1F2","border":"1px solid #FFE4E6","color":"#E11D48","fontSize":"11px","fontWeight":"800","fontFamily":"'IBM Plex Mono', monospace","padding":"4px 12px","borderRadius":"20px","textTransform":"uppercase","letterSpacing":"0.06em","marginBottom":"14px"}}>
          The Cost of Guessing
        </div>
        <h2 style={{"fontSize":"clamp(30px, 4vw, 44px)","fontWeight":"800","letterSpacing":"-0.03em","color":"#0F172A","marginBottom":"12px","lineHeight":"1.15"}}>
          Why Importers Lose Money
        </h2>
        <p style={{"fontSize":"16.5px","fontWeight":"450","color":"#64748B","lineHeight":"1.55"}}>
          Stop guessing your shipping, PAL, and VAT. The math is simple when calculated with 100% precision.
        </p>
      </div>

      {/*  Two-Card Comparison Matrix  */}
      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(min(100%, 330px), 1fr))","gap":"24px","maxWidth":"920px","margin":"0 auto","alignItems":"stretch"}}>
        
        {/*  CARD 1: THE TRAP (Manual Guessing)  */}
        <div style={{"background":"#FFFFFF","borderRadius":"18px","padding":"32px 28px","boxShadow":"0 4px 20px -4px rgba(15, 23, 42, 0.04)","border":"1px solid #FEE2E2","display":"flex","flexDirection":"column","position":"relative"}}>
          
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","marginBottom":"24px"}}>
            <div style={{"display":"inline-flex","alignItems":"center","gap":"7px","background":"#FEF2F2","color":"#DC2626","fontSize":"12.5px","fontWeight":"800","padding":"6px 14px","borderRadius":"20px","border":"1px solid #FECACA","letterSpacing":"-0.01em"}}>
              <span>❌</span>
              <span>Manual Guessing (The Trap)</span>
            </div>
          </div>

          <div style={{"fontFamily":"'IBM Plex Mono', monospace","fontSize":"14px","color":"#475569","display":"flex","flexDirection":"column","gap":"14px","flex":"1"}}>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
              <span>Buy Price (Supplier)</span>
              <span style={{"color":"#0F172A","fontWeight":"600"}}>LKR 2,250</span>
            </div>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
              <span>Rough Shipping Guess</span>
              <span style={{"color":"#0F172A","fontWeight":"600"}}>LKR 350</span>
            </div>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","color":"#DC2626"}}>
              <span style={{"fontWeight":"600","textDecoration":"line-through","opacity":"0.85"}}>Customs, PAL &amp; VAT</span>
              <span style={{"fontWeight":"700","background":"#FEF2F2","padding":"2px 8px","borderRadius":"6px","fontSize":"12px","border":"1px solid #FECACA"}}>LKR 0 (Forgotten)</span>
            </div>

            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","color":"#94A3B8"}}>
              <span>Port Clearance</span>
              <span style={{"fontWeight":"500"}}>LKR 0 (Ignored)</span>
            </div>
            
            <div style={{"height":"1px","borderTop":"1.5px dashed #E2E8F0","margin":"4px 0"}}></div>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
              <span style={{"fontWeight":"600","color":"#64748B"}}>Perceived Cost</span>
              <span style={{"fontWeight":"700","color":"#0F172A","fontSize":"16px"}}>LKR 2,600</span>
            </div>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
              <span>You Sell For</span>
              <span style={{"color":"#0F172A","fontWeight":"600"}}>LKR 3,500</span>
            </div>
          </div>
          
          <div style={{"background":"linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)","border":"1.5px solid #FECACA","borderRadius":"12px","padding":"18px 16px","marginTop":"24px","textAlign":"center"}}>
            <div style={{"fontSize":"11.5px","fontWeight":"700","color":"#991B1B","marginBottom":"4px","textTransform":"uppercase","letterSpacing":"0.04em"}}>Actual Cost at Port: LKR 4,206</div>
            <div style={{"fontSize":"19px","fontWeight":"800","color":"#DC2626","letterSpacing":"-0.01em"}}>💸 REAL LOSS: -LKR 706 / pc</div>
          </div>
        </div>

        {/*  CARD 2: TRUELANDED EXACT (God-Tier Light Masterpiece)  */}
        <div style={{"background":"#FFFFFF","borderRadius":"18px","padding":"32px 28px","boxShadow":"0 16px 36px -8px rgba(16, 185, 129, 0.14), 0 0 0 1px rgba(16, 185, 129, 0.2)","border":"2px solid #10B981","display":"flex","flexDirection":"column","position":"relative"}}>
          
          <div style={{"position":"absolute","top":"-12px","right":"20px","background":"linear-gradient(135deg, #059669 0%, #10B981 100%)","color":"#FFFFFF","fontSize":"10.5px","fontWeight":"800","padding":"4px 12px","borderRadius":"20px","textTransform":"uppercase","letterSpacing":"0.05em","boxShadow":"0 4px 12px rgba(5, 150, 105, 0.3)"}}>
            ⚡ 100% PRECISE
          </div>

          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","marginBottom":"24px"}}>
            <div style={{"display":"inline-flex","alignItems":"center","gap":"7px","background":"#ECFDF5","color":"#047857","fontSize":"12.5px","fontWeight":"800","padding":"6px 14px","borderRadius":"20px","border":"1.5px solid #A7F3D0","boxShadow":"0 1px 4px rgba(16, 185, 129, 0.08)"}}>
              <span style={{"fontSize":"14px"}}>🚢</span>
              <span>TrueLanded (Exact)</span>
            </div>
          </div>

          <div style={{"fontFamily":"'IBM Plex Mono', monospace","fontSize":"14px","color":"#475569","display":"flex","flexDirection":"column","gap":"14px","flex":"1"}}>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
              <span>Buy Price (Supplier)</span>
              <span style={{"color":"#0F172A","fontWeight":"600"}}>LKR 2,250</span>
            </div>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","color":"#059669"}}>
              <span style={{"fontWeight":"600","display":"flex","alignItems":"center","gap":"4px"}}><span>✓</span> Exact CBM Freight</span>
              <span style={{"fontWeight":"700","color":"#047857"}}>LKR 480</span>
            </div>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","color":"#059669"}}>
              <span style={{"fontWeight":"600","display":"flex","alignItems":"center","gap":"4px"}}><span>✓</span> Customs, PAL &amp; VAT</span>
              <span style={{"fontWeight":"700","color":"#047857"}}>LKR 1,296</span>
            </div>

            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","color":"#059669"}}>
              <span style={{"fontWeight":"600","display":"flex","alignItems":"center","gap":"4px"}}><span>✓</span> Port Clearance</span>
              <span style={{"fontWeight":"700","color":"#047857"}}>LKR 180</span>
            </div>
            
            <div style={{"height":"1px","borderTop":"1.5px dashed #A7F3D0","margin":"4px 0"}}></div>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
              <span style={{"fontWeight":"800","color":"#0F172A"}}>True Landed Cost</span>
              <span style={{"fontWeight":"800","color":"#047857","fontSize":"16.5px"}}>LKR 4,206</span>
            </div>
            
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","color":"#0F172A"}}>
              <span style={{"fontWeight":"700"}}>Safe Target Price</span>
              <span style={{"fontWeight":"800","fontSize":"14.5px","background":"#FEF3C7","color":"#92400E","padding":"3px 8px","borderRadius":"6px","border":"1px solid #FDE68A"}}>LKR 5,680</span>
            </div>
          </div>
          
          <div style={{"background":"linear-gradient(135deg, #059669 0%, #10B981 100%)","border":"1px solid #047857","borderRadius":"12px","padding":"18px 16px","marginTop":"24px","textAlign":"center","color":"#FFFFFF","boxShadow":"0 6px 18px rgba(16, 185, 129, 0.25)"}}>
            <div style={{"fontSize":"11.5px","fontWeight":"700","marginBottom":"4px","opacity":"0.92","textTransform":"uppercase","letterSpacing":"0.04em"}}>Calculated in 3 Seconds</div>
            <div style={{"fontSize":"19px","fontWeight":"900","letterSpacing":"-0.01em"}}>💰 LOCKED PROFIT: +LKR 1,474 / pc</div>
          </div>
        </div>

      </div>

      {/*  App Interface Demo Mockup Frame (Mac/Browser Chrome)  */}
      <div style={{"marginTop":"60px","maxWidth":"860px","marginLeft":"auto","marginRight":"auto"}}>
        <div style={{"background":"#FFFFFF","borderRadius":"16px","border":"1px solid #CBD5E1","boxShadow":"0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.02)","overflow":"hidden"}}>
          
          {/*  Subtle macOS Browser Header Bar  */}
          <div style={{"background":"#F1F5F9","borderBottom":"1px solid #E2E8F0","padding":"10px 16px","display":"flex","alignItems":"center","gap":"8px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"6px"}}>
              <span style={{"width":"10px","height":"10px","borderRadius":"50%","background":"#EF4444","display":"inline-block"}}></span>
              <span style={{"width":"10px","height":"10px","borderRadius":"50%","background":"#F59E0B","display":"inline-block"}}></span>
              <span style={{"width":"10px","height":"10px","borderRadius":"50%","background":"#10B981","display":"inline-block"}}></span>
            </div>
            <div style={{"flex":"1","textAlign":"center","marginRight":"48px"}}>
              <span style={{"background":"#FFFFFF","border":"1px solid #CBD5E1","fontSize":"11px","fontFamily":"'IBM Plex Mono', monospace","color":"#64748B","padding":"3px 18px","borderRadius":"6px","display":"inline-block","fontWeight":"500"}}>
                app.truelanded.com/calculator
              </span>
            </div>
          </div>

          {/*  The Real App Screenshot  */}
          <img src="/images/app_demo_2.png" alt="TrueLanded Free Calculator Interface" style={{"width":"100%","display":"block","height":"auto"}} loading="lazy" />
        </div>
      </div>

      {/*  Clean High-Conversion CTA Button  */}
      <div style={{"textAlign":"center","marginTop":"36px"}}>
        <a href="/free" className="lp-btn-main" style={{"fontSize":"15.5px","padding":"14px 32px","borderRadius":"8px","textDecoration":"none","fontWeight":"700","boxShadow":"0 4px 14px rgba(224, 77, 45, 0.28)"}}>
          ⚡ Launch Free Import Calculator
        </a>
      </div>

    </div>
  </section>

  {/*  Hyper-Minimal Spec Grid  */}
  <section className="lp-section" id="features" style={{"background":"#F8FAFC","padding":"80px 0"}}>
    <div className="lp-container" style={{"maxWidth":"800px","margin":"0 auto"}}>
      
      <div style={{"marginBottom":"40px","borderBottom":"1px solid #CBD5E1","paddingBottom":"16px"}}>
        <h2 style={{"fontSize":"18px","fontWeight":"800","color":"#0F172A","letterSpacing":"-0.01em","textTransform":"uppercase"}}>Core Engine Specs</h2>
      </div>

      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(min(100%, 300px), 1fr))","gap":"32px 48px"}}>
        
        <div>
          <div style={{"display":"flex","alignItems":"center","gap":"8px","fontWeight":"700","color":"#0F172A","marginBottom":"6px","fontSize":"14.5px"}}>
            <span>📄</span> Invoice Parsing
          </div>
          <div style={{"color":"#64748B","fontSize":"13.5px","lineHeight":"1.5"}}>Drag &amp; drop Excel or paste raw text. Auto-extracts items, quantities, and prices instantly.</div>
        </div>

        <div>
          <div style={{"display":"flex","alignItems":"center","gap":"8px","fontWeight":"700","color":"#0F172A","marginBottom":"6px","fontSize":"14.5px"}}>
            <span>💱</span> 14 Currencies <span style={{"fontSize":"10px","background":"#E2E8F0","padding":"2px 6px","borderRadius":"4px","color":"#475569"}}>PRO</span>
          </div>
          <div style={{"color":"#64748B","fontSize":"13.5px","lineHeight":"1.5"}}>Built-in conversion for USD, RMB, AED, EUR, GBP, and more with live mathematical precision.</div>
        </div>

        <div>
          <div style={{"display":"flex","alignItems":"center","gap":"8px","fontWeight":"700","color":"#0F172A","marginBottom":"6px","fontSize":"14.5px"}}>
            <span>✈️</span> Air &amp; Sea Cargo <span style={{"fontSize":"10px","background":"#E2E8F0","padding":"2px 6px","borderRadius":"4px","color":"#475569"}}>PRO</span>
          </div>
          <div style={{"color":"#64748B","fontSize":"13.5px","lineHeight":"1.5"}}>Calculate exactly by CBM or Kg. Automatically handles airline whole-kilogram rounding rules.</div>
        </div>

        <div>
          <div style={{"display":"flex","alignItems":"center","gap":"8px","fontWeight":"700","color":"#0F172A","marginBottom":"6px","fontSize":"14.5px"}}>
            <span>🏛️</span> Automated Taxes
          </div>
          <div style={{"color":"#64748B","fontSize":"13.5px","lineHeight":"1.5"}}>Sri Lankan Customs Duty, PAL, and compounded VAT applied perfectly across every single item.</div>
        </div>

        <div>
          <div style={{"display":"flex","alignItems":"center","gap":"8px","fontWeight":"700","color":"#0F172A","marginBottom":"6px","fontSize":"14.5px"}}>
            <span>📤</span> 1-Click Export <span style={{"fontSize":"10px","background":"#E2E8F0","padding":"2px 6px","borderRadius":"4px","color":"#475569"}}>PRO</span>
          </div>
          <div style={{"color":"#64748B","fontSize":"13.5px","lineHeight":"1.5"}}>Instantly share clean pricing manifests to WhatsApp or export as a beautiful PDF.</div>
        </div>

        <div>
          <div style={{"display":"flex","alignItems":"center","gap":"8px","fontWeight":"700","color":"#0F172A","marginBottom":"6px","fontSize":"14.5px"}}>
            <span>🔒</span> 100% Private
          </div>
          <div style={{"color":"#64748B","fontSize":"13.5px","lineHeight":"1.5"}}>Core math runs entirely in your local browser. Optional AI photo/PDF parsing sends only that one document to extract line items.</div>
        </div>

      </div>
    </div>
  </section>

  {/*  Pricing  */}
  <section className="lp-section" id="pricing" style={{"background":"#F8FAFC","padding":"100px 0","borderTop":"1px solid #E2E8F0"}}>
    <div className="lp-container">
      <div className="lp-section-header" style={{"marginBottom":"64px"}}>
        <h2 className="lp-section-title" style={{"fontSize":"clamp(32px, 4vw, 44px)","fontWeight":"800","letterSpacing":"-0.03em"}}>Simple, One-Time Pricing.</h2>
        <p className="lp-section-sub" style={{"fontSize":"18px","color":"#64748B"}}>Pay once, use forever. No monthly subscriptions.</p>
      </div>

      <div className="lp-pricing-grid">
        
        {/*  Free Card  */}
        <div className="lp-price-card" style={{"boxShadow":"0 10px 30px -10px rgba(15, 23, 42, 0.05)"}}>
          <h3 className="lp-price-title">Free Plan</h3>
          <p className="lp-price-sub">For simple China ocean imports.</p>
          <div className="lp-price-num">$0<span> / forever</span></div>
          <div className="lp-price-note" style={{"color":"#64748B"}}>Free to use without an account.</div>
          
          <ul className="lp-price-list">
            <li><span className="chk">✓</span> China Sea Imports (RMB &amp; USD)</li>
            <li><span className="chk">✓</span> Ocean Freight Calculation (CBM)</li>
            <li><span className="chk">✓</span> Customs Duty &amp; VAT Breakdown</li>
            <li><span className="chk">✓</span> Auto-saved securely in your browser</li>
            <li className="off"><span className="chk" style={{"color":"#94A3B8"}}>✕</span> 14 Global Currencies</li>
            <li className="off"><span className="chk" style={{"color":"#94A3B8"}}>✕</span> Air Cargo with Kg Rounding</li>
            <li className="off"><span className="chk" style={{"color":"#94A3B8"}}>✕</span> 1-Click WhatsApp &amp; PDF Sharing</li>
          </ul>
          
          <a href="/free" className="lp-btn-price free">Launch Free Calculator →</a>
        </div>

        {/*  Pro Card  */}
        <div className="lp-price-card featured" style={{"background":"#FFFFFF","border":"2px solid #0F172A","boxShadow":"0 20px 40px -10px rgba(15, 23, 42, 0.15)"}}>
          <div className="lp-price-ribbon" style={{"background":"#E04D2D","padding":"4px 12px","fontSize":"11px"}}>ONE-TIME $9</div>
          <h3 className="lp-price-title">Pro Lifetime</h3>
          <p className="lp-price-sub">For anyone importing from anywhere.</p>
          <div className="lp-price-num">$9<span> / one-time</span></div>
          <div className="lp-price-note" style={{"color":"#059669"}}>14-Day Money-Back Guarantee.</div>
          
          <ul className="lp-price-list">
            <li><span className="chk">✓</span> <b>Everything in Free</b></li>
            <li><span className="chk">✓</span> 14 Global Currencies (AED, INR, EUR, GBP, JPY...)</li>
            <li><span className="chk">✓</span> Air Cargo (Kg) &amp; Sea Freight (CBM)</li>
            <li><span className="chk">✓</span> Automatic Air Cargo Kg Rounding</li>
            <li><span className="chk">✓</span> Upload Excel &amp; Supplier Invoices</li>
            <li><span className="chk">✓</span> 1-Click WhatsApp &amp; PDF Export</li>
          </ul>
          
          <a href="https://built-by-aadil.lemonsqueezy.com/checkout/buy/b789412f-3a44-4c06-a3f6-4dc36eb391d8?logo=0" className="lp-btn-price pro">⚡ Get Pro Access ($9)</a>
        </div>

      </div>
    </div>
  </section>


  {/*  FAQ  */}
  <section className="lp-section" id="faq" style={{"background":"#FFFFFF","borderTop":"1px solid #E2E8F0"}}>
    <div className="lp-container">
      <div className="lp-section-header">
        <span className="lp-section-tag">Questions</span>
        <h2 className="lp-section-title">Common Questions</h2>
        <p className="lp-section-sub">Simple answers to clear any doubts.</p>
      </div>

      <div className="lp-faq-wrap">
        <div className={`lp-faq-item ${openFaq[0] ? "open" : ""}`}>
          <div className="lp-faq-q" onClick={() => toggleFaq(0)}><span>Do I pay every month or just once?</span><span className="lp-faq-icon">+</span></div>
          <div className="lp-faq-a">You only pay <strong>$9 one time</strong>. There are no monthly charges and no subscriptions. You keep lifetime access.</div>
        </div>

        <div className={`lp-faq-item ${openFaq[1] ? "open" : ""}`}>
          <div className="lp-faq-q" onClick={() => toggleFaq(1)}><span>How does Air Cargo weight work?</span><span className="lp-faq-icon">+</span></div>
          <div className="lp-faq-a">Airlines charge for full kilograms (for example, 2.1 kg is charged as 3.0 kg). Pro automatically calculates this so you never lose money on shipping.</div>
        </div>

        <div className={`lp-faq-item ${openFaq[2] ? "open" : ""}`}>
          <div className="lp-faq-q" onClick={() => toggleFaq(2)}><span>Can I upload my supplier's Excel sheet?</span><span className="lp-faq-icon">+</span></div>
          <div className="lp-faq-a">Yes. Drop your Excel file or paste rows of text. The calculator automatically reads the item name, quantity, and price.</div>
        </div>

        <div className={`lp-faq-item ${openFaq[3] ? "open" : ""}`}>
          <div className="lp-faq-q" onClick={() => toggleFaq(3)}><span>What if I am not happy with it?</span><span className="lp-faq-icon">+</span></div>
          <div className="lp-faq-a">We give you a <strong>14-day money-back guarantee</strong>. If you want a refund, email aadil.mohomed786@gmail.com and we will refund your $9.</div>
        </div>
      </div>
    </div>
  </section>

  {/*  Simple Clean Footer  */}
  <footer className="lp-footer">
    <div className="lp-container">
      <div className="lp-footer-row1">
        <div className="lp-footer-brand">
          <img src="/images/logo.svg" alt="TrueLanded" style={{"height":"24px","width":"auto","display":"block"}} />
          <span className="tag">Payments by Lemon Squeezy</span>
        </div>
        <div className="lp-footer-links">
          <button type="button" onClick={() => setPolicyModal("refund")}>Refunds (14 Days)</button>
          <button type="button" onClick={() => setPolicyModal("privacy")}>Privacy Policy</button>
          <button type="button" onClick={() => setPolicyModal("terms")}>Terms of Service</button>
          <button type="button" onClick={() => setPolicyModal("contact")} style={{"color":"#0F172A","fontWeight":"700"}}>Contact Support</button>
        </div>
      </div>
      <div className="lp-footer-row2">
        <div>© 2026 TrueLanded. All rights reserved.</div>
        
      </div>
    </div>
  </footer>
</div>

{/*  Legal Modal (Pop-up)  */}
<div className={`lp-modal-overlay ${policyModal ? 'active' : ''}`} id="policyModal" onClick={(e) => { if (e.target === e.currentTarget) setPolicyModal(null); }}>
  <div className="lp-modal">
    <div className="lp-modal-header">
      <div className="lp-modal-title" id="modalTitle">{policyModal ? POLICIES[policyModal]?.title : 'Policy Details'}</div>
      <button className="lp-modal-close" aria-label="Close" onClick={() => setPolicyModal(null)}>✕</button>
    </div>
    <div className="lp-modal-body" id="modalContent" dangerouslySetInnerHTML={{ __html: policyModal ? POLICIES[policyModal]?.body : '' }} />
    <div className="lp-modal-footer">
      <button className="lp-modal-btn" onClick={() => setPolicyModal(null)}>Close</button>
    </div>
  </div>
</div>



{/*  Pro User Login Modal  */}
<div className="lp-modal-overlay" id="lpLoginModal" style={{"display":loginModalOpen ? "flex" : "none","position":"fixed","inset":"0","background":"rgba(15,23,42,0.7)","backdropFilter":"blur(8px)","WebkitBackdropFilter":"blur(8px)","zIndex":"99999","alignItems":"center","justifyContent":"center","padding":"20px"}} onClick={(e) => { if (e.target === e.currentTarget) setLoginModalOpen(false); }}>
  <div className="lp-modal-card" style={{"background":"#FFFFFF","borderRadius":"16px","width":"100%","maxWidth":"440px","padding":"32px 26px","boxShadow":"0 25px 50px -12px rgba(0,0,0,0.25)","textAlign":"center","border":"1px solid #E2E8F0","position":"relative"}}>
    <button type="button" onClick={() => setLoginModalOpen(false)} style={{"position":"absolute","top":"16px","right":"16px","background":"#F1F5F9","border":"none","width":"30px","height":"30px","borderRadius":"50%","display":"flex","alignItems":"center","justifyContent":"center","cursor":"pointer","fontSize":"14px","color":"#64748B","fontWeight":"700"}}>✕</button>
    <div style={{"width":"52px","height":"52px","borderRadius":"50%","background":"#FEF2F2","color":"#E04D2D","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"24px","margin":"0 auto 14px"}}>🔑</div>
    <h3 style={{"fontSize":"20px","fontWeight":"800","color":"#0F172A","marginBottom":"6px","letterSpacing":"-0.02em"}}>Pro User Login</h3>
    <p style={{"fontSize":"13.5px","color":"#64748B","lineHeight":"1.5","marginBottom":"20px"}}>
      Enter the email address you used when purchasing your Pro Lifetime License.
    </p>
    
    <form id="lpLoginForm" onSubmit={handleProLogin} style={{"display":"flex","flexDirection":"column","gap":"12px","textAlign":"left"}}>
      <div>
        <label style={{"fontSize":"12px","fontWeight":"700","color":"#334155","display":"block","marginBottom":"5px"}}>Checkout Email Address</label>
        <input type="email" id="lpLoginEmailInput" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="e.g. alex@company.com" style={{"width":"100%","padding":"11px 14px","borderRadius":"8px","border":"1px solid #CBD5E1","fontSize":"14.5px","fontFamily":"inherit","outline":"none","transition":"border-color 0.2s"}} />
      </div>
      
      {loginStatus && (
        <div id="lpLoginStatus" style={{"display":"block","padding":"10px 12px","borderRadius":"8px","fontSize":"13px","fontWeight":"600","lineHeight":"1.4","background": loginStatus.success ? "#ECFDF5" : "#F1F5F9","color": loginStatus.success ? "#065F46" : "#334155"}}>
          {loginStatus.msg}
        </div>
      )}

      <button type="submit" id="lpLoginSubmitBtn" disabled={loginLoading} style={{"background":"#E04D2D","color":"#FFFFFF","border":"none","padding":"13px 18px","borderRadius":"8px","fontSize":"14.5px","fontWeight":"700","cursor": loginLoading ? "not-allowed" : "pointer","display":"flex","alignItems":"center","justifyContent":"center","gap":"8px","boxShadow":"0 4px 12px rgba(224,77,45,0.25)","transition":"all 0.2s","marginTop":"4px"}}>
        <span>{loginLoading ? 'Verifying license...' : 'Verify & Access Pro'}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </button>
    </form>
    
    <div style={{"marginTop":"18px","paddingTop":"14px","borderTop":"1px dashed #E2E8F0","fontSize":"12px","color":"#64748B"}}>
      Don't have a license yet? <a href="https://built-by-aadil.lemonsqueezy.com/checkout/buy/b789412f-3a44-4c06-a3f6-4dc36eb391d8?logo=0" style={{"color":"#E04D2D","fontWeight":"700","textDecoration":"underline"}}>Unlock Pro for $9</a>
    </div>
  </div>
</div>




    
    </>
  );
}
