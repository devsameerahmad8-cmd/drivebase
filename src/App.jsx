import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import {
  createCustomer,
  customerPayload,
  emptyCustomer,
  getCustomerById,
  removeCustomer,
  subscribeCustomers,
  updateCustomer,
} from "./customers";

const statusStyles = {
  Pending: "text-[#876648] bg-[#f1e8e0]",
  "In Progress": "text-[#527d94] bg-[#eaf2f6]",
  Cleared: "text-[#a24238] bg-[#fff2ef]",
  Hold: "text-[#a24238] bg-[#fff2ef]",
  Valid: "text-[#a24238] bg-[#fff2ef]",
  Invalid: "text-[#a24238] bg-[#fff2ef]",
  CLEARED: "text-[#a24238] bg-[#fff2ef]",
  HOLD: "text-[#a24238] bg-[#fff2ef]",
  VALID: "text-[#a24238] bg-[#fff2ef]",
  INVALID: "text-[#a24238] bg-[#fff2ef]",
};

const certificateFields = [
  ["certificateNumber", "Certificate Number", "رقم البطاقة"],
  ["date", "Date", "تاريخ"],
  ["makeBodyType", "Make / Body Type", "نوع المركبة / الشكل"],
  ["importerName", "Importer Name", "اسم المستورد / المالك"],
  ["declarationNumber", "Declaration Number", "رقم البيان الجمركي"],
  ["model", "Model", "سنة الصنع"],
  ["country", "Country", "بلد الصنع"],
  ["chassisNo", "Chassis No", "رقم القاعدة"],
  ["engineNo", "Engine No", "رقم المحرك"],
  ["color", "Color", "اللون"],
  ["remarks", "Remarks", "الملاحظات"],
  ["userId", "User ID", "الموظف"],
  ["status", "Status", "البطاقة"],
];

const certificateFont = 'Arial, Helvetica, "Noto Naskh Arabic", sans-serif';
const certificateGold = "#bc9e6a";
const certificateBorder = "#d0d0d0";

const iconPaths = {
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  dashboard: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  check: <><path d="m5 12 4 4L19 6" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
};

function Icon({ name, size = 18, className = "" }) {
  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name]}
    </svg>
  );
}

function getPageFromPath() {
  if (window.location.pathname === "/admin/dashboard") return "dashboard";
  if (window.location.pathname === "/admin") return "login";
  if (/^\/record\/[^/]+\/?$/.test(window.location.pathname)) return "record";
  return "home";
}

function getRecordIdFromPath() {
  const match = window.location.pathname.match(/^\/record\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function App() {
  const [page, setPage] = useState(getPageFromPath);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);

  useEffect(() => {
    const onPopState = () => setPage(getPageFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return undefined;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser && getPageFromPath() === "login") {
        window.history.replaceState({}, "", "/admin/dashboard");
        setPage("dashboard");
      }
    });
  }, []);

  function navigate(destination) {
    const path = destination === "dashboard" ? "/admin/dashboard" : destination === "login" ? "/admin" : "/";
    window.history.pushState({}, "", path);
    setPage(destination);
    window.scrollTo(0, 0);
  }

  async function handleLogout() {
    if (auth) await signOut(auth);
    setUser(null);
    navigate("home");
  }

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper font-sans text-ink">
        <p className="font-mono text-[11px] tracking-[1.4px] text-muted">LOADING DRIVEBASE…</p>
      </main>
    );
  }

  if (page === "dashboard" && user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }
  if (page === "record") {
    if (!user) {
      return (
        <LoginPage
          onLogin={() => setPage("record")}
          onHome={() => navigate("home")}
        />
      );
    }
    return <CustomerRecordPage customerId={getRecordIdFromPath()} />;
  }
  if (page === "login" || page === "dashboard") {
    return (
      <LoginPage
        onLogin={() => navigate("dashboard")}
        onHome={() => navigate("home")}
      />
    );
  }
  return <LandingPage onAdmin={() => navigate("login")} />;
}

function Brand({ className = "", markClassName = "", textClassName = "" }) {
  return (
    <a className={`inline-flex items-center gap-2.5 font-display text-xl font-extrabold tracking-[-1.1px] ${className}`} href="/" aria-label="Drivebase home">
      <span className={`grid h-[30px] w-9 place-items-center text-[#263a31] ${markClassName}`}>
        <CarMark className="h-[22px] w-8" />
      </span>
      <span className={textClassName}>drivebase<span className="text-[#78b83e]">.</span></span>
    </a>
  );
}

function Button({ children, className = "", variant = "dark", ...props }) {
  const variants = {
    dark: "bg-[#192521] text-white hover:bg-[#2d423a] hover:shadow-[0_8px_20px_#12231d22]",
    lime: "bg-lime text-ink hover:bg-[#cffb8c] hover:shadow-[0_8px_22px_#baf16a40]",
    outline: "border border-[#dce1d9] bg-white text-[#5a655d]",
  };
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[5px] border-0 px-5 text-[13px] font-bold transition-[transform,background,box-shadow] duration-200 hover:-translate-y-0.5 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function LandingPage({ onAdmin }) {
  return (
    <main className="overflow-hidden bg-paper">
      <header className="relative z-[5] flex h-[82px] items-center justify-between bg-[#f7f8f3] px-[7.1%] max-[1050px]:px-[5%] max-[760px]:h-[68px] max-[760px]:px-[22px]">
        <Brand />
        <nav className="ml-[90px] flex gap-[41px] text-[13px] text-[#69716c] max-[760px]:hidden" aria-label="Main navigation">
          <a className="hover:text-[#569425]" href="#features">Why Drivebase</a>
          <a className="hover:text-[#569425]" href="#how-it-works">How it works</a>
        </nav>
        <Button className="min-h-[42px] px-[17px] text-xs max-[760px]:min-h-[39px]" onClick={onAdmin}>
          Admin login <Icon name="arrow" size={16} />
        </Button>
      </header>

      <section className="relative grid min-h-[630px] grid-cols-[minmax(370px,.88fr)_minmax(500px,1.12fr)] items-center bg-forest px-[7.1%] pb-[69px] pt-[35px] text-white max-[1050px]:grid-cols-[.9fr_1.1fr] max-[1050px]:px-[5%] max-[760px]:grid-cols-1 max-[760px]:px-[23px] max-[760px]:pb-[70px] max-[760px]:pt-[63px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(#ffffff13_1px,transparent_1px),linear-gradient(90deg,#ffffff13_1px,transparent_1px)] [background-size:70px_70px] [mask-image:linear-gradient(90deg,transparent,#000_72%)]"
        />
        <div className="relative z-[1] pt-px max-[760px]:z-[3]">
          <div className="mb-[23px] flex items-center gap-[9px] font-mono text-[9px] tracking-[1.4px] text-[#c0c9c1]">
            <span className="block size-1.5 rounded-full bg-lime shadow-[0_0_12px_#baf16a]" />
            YOUR DEALERSHIP, IN THE DRIVER&apos;S SEAT
          </div>
          <h1 className="m-0 font-display text-[clamp(51px,5.4vw,76px)] font-medium leading-[1.05] tracking-[-4.6px] max-[1050px]:text-[61px] max-[760px]:text-[clamp(52px,12vw,72px)] max-[760px]:tracking-[-3.5px]">
            Every customer.<br />A <span className="text-lime">better drive.</span>
          </h1>
          <p className="my-[22px] mb-[27px] max-w-[390px] text-[15px] leading-[1.8] text-[#b4c0b8] max-[760px]:max-w-[420px]">
            The customer record system built for people who love cars as much as they love a great customer experience.
          </p>
          <div className="flex items-center gap-[21px] max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-[15px]">
            <Button variant="lime" className="min-h-[50px] px-[19px]" onClick={onAdmin}>
              Get behind the wheel <Icon name="arrow" size={17} />
            </Button>
            <a className="text-xs font-semibold text-[#e6eee8] transition-colors duration-200 hover:text-[#569425]" href="#features">
              Take a look around <span className="pl-[5px] text-lime">↓</span>
            </a>
          </div>
          <div className="mt-[54px] flex items-center gap-[13px] max-[760px]:mt-[34px]">
            <div className="flex pl-0.5" aria-hidden="true">
              {["JM", "AK", "SL", "+"].map((label, index) => (
                <span
                  key={label}
                  className={`-ml-[3px] grid size-[26px] place-items-center rounded-full border-2 border-forest text-[7px] font-bold first:ml-0 ${
                    ["bg-[#d1ac84] text-[#27332d]", "bg-[#b3d1bf] text-[#27332d]", "bg-[#e8c6bc] text-[#27332d]", "bg-[#71877a] text-white"][index]
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
            <div>
              <strong className="block text-[11px] font-semibold">Built for the long drive</strong>
              <small className="mt-1 block text-[10px] text-[#8f9e94]">Good relationships go places.</small>
            </div>
          </div>
        </div>

        <div
          className="relative mx-[-4px] mt-px mb-0 h-[477px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_60%,#273c34_0,#192a26_37%,#172421_72%)] max-[1050px]:mr-[-55px] max-[1050px]:h-[430px] max-[760px]:row-start-2 max-[760px]:mx-[-17px] max-[760px]:-mt-2.5 max-[760px]:-mb-3 max-[760px]:h-[330px] max-[760px]:w-[calc(100%+34px)] max-[390px]:h-[270px]"
          aria-label="Illustration of a sports car in motion"
        >
          <div aria-hidden="true" className="absolute left-[21%] top-[5%] size-[420px] rounded-full border border-[#ccffc318] max-[760px]:left-[calc(50%-165px)] max-[760px]:top-0 max-[760px]:size-[330px]" />
          <div aria-hidden="true" className="absolute left-[29%] top-[17%] size-[310px] rounded-full border border-[#ccffc31b] max-[760px]:left-[calc(50%-122px)] max-[760px]:top-[13%] max-[760px]:size-[245px]" />
          <div className="absolute left-[31px] right-[31px] top-[27px] z-[2] flex justify-between font-mono text-[8px] tracking-[1.4px] text-[#a3b5a8] max-[760px]:left-[19px] max-[760px]:right-[19px] max-[760px]:top-[17px]">
            <span>01 / 03</span>
            <span className="text-lime">MADE TO MOVE</span>
          </div>
          <div className="absolute bottom-[27%] left-[23%] h-[12%] w-[58%] bg-[#b4fa5a] opacity-[0.19] blur-[61px]" />
          <div className="absolute left-1/2 top-[54%] h-[120px] w-[122%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-[#c6f19e24]" />
          <div className="absolute left-1/2 top-[54%] h-[196px] w-[134%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-[#c6f19e24]" />
          <div className="absolute left-[24%] top-[35%] h-px w-[55%] animate-speed bg-gradient-to-r from-transparent via-[#c4ff9455] to-transparent [animation-delay:.3s]" />
          <div className="absolute left-[9%] top-[70%] h-px w-[78%] animate-speed bg-gradient-to-r from-transparent via-[#c4ff9455] to-transparent [animation-delay:1.2s]" />
          <div className="absolute left-[34%] top-[46%] h-px w-[40%] animate-speed bg-gradient-to-r from-transparent via-[#c4ff9455] to-transparent [animation-delay:2s]" />
          <svg className="absolute left-[-1%] top-[22%] z-[1] w-[106%] animate-car-float overflow-visible max-[760px]:left-[-6%] max-[760px]:top-[17%] max-[760px]:w-[112%] max-[390px]:top-[15%]" viewBox="0 0 760 350" role="img" aria-label="A lime green sports car driving forward">
            <defs>
              <linearGradient id="carPaint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d5ff8d" /><stop offset=".5" stopColor="#9ce345" /><stop offset="1" stopColor="#5d9c28" /></linearGradient>
              <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8d9d0" /><stop offset="1" stopColor="#526d69" /></linearGradient>
              <filter id="carShadow" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="12" /></filter>
            </defs>
            <ellipse cx="375" cy="283" rx="290" ry="24" fill="#000" opacity=".58" filter="url(#carShadow)" />
            <g className="origin-center animate-car-rock">
              <path d="M112 220c13-28 44-48 81-60l81-26 49-64c14-18 31-27 59-27h91c31 0 58 14 77 37l61 72 77 22c24 7 40 25 43 48l4 30c2 17-9 31-26 34l-30 5H144c-23 0-37-12-39-34l-2-17c-1-8 2-15 9-20Z" fill="url(#carPaint)" stroke="#d9ffae" strokeWidth="3" />
              <path d="m302 129 42-55c9-12 22-18 39-18h36v77Z" fill="url(#glass)" stroke="#d8f1d5" strokeWidth="3" />
              <path d="M433 56h40c23 0 42 11 58 31l35 42H433Z" fill="url(#glass)" stroke="#d8f1d5" strokeWidth="3" />
              <path d="m101 224 77-20-12 35-63 6M634 200l75 19 6 22-75-1" fill="#f7fff0" />
              <path d="M235 167c86 9 244 9 345-2M183 201l420 3" fill="none" stroke="#e4ffc5" strokeWidth="2" opacity=".72" />
              <path d="m112 252 577 4" fill="none" stroke="#32432f" strokeWidth="9" strokeLinecap="round" opacity=".5" />
              <path d="M277 261h229" fill="none" stroke="#f0ffd8" strokeWidth="5" strokeLinecap="round" opacity=".75" />
              <circle cx="229" cy="254" r="50" fill="#17211f" stroke="#a5ee52" strokeWidth="5" />
              <circle cx="229" cy="254" r="29" fill="#81918a" stroke="#d5e4d9" strokeWidth="4" />
              <circle cx="229" cy="254" r="10" fill="#202927" />
              <path d="M229 226v56M201 254h56m-48-20 40 40m0-40-40 40" stroke="#d8e6de" strokeWidth="3" />
              <circle cx="583" cy="254" r="50" fill="#17211f" stroke="#a5ee52" strokeWidth="5" />
              <circle cx="583" cy="254" r="29" fill="#81918a" stroke="#d5e4d9" strokeWidth="4" />
              <circle cx="583" cy="254" r="10" fill="#202927" />
              <path d="M583 226v56m-28-28h56m-48-20 40 40m0-40-40 40" stroke="#d8e6de" strokeWidth="3" />
              <path d="m119 220 48-13m480-4 48 12" stroke="#fff2cf" strokeWidth="5" strokeLinecap="round" />
            </g>
          </svg>
          <div className="absolute bottom-[10%] left-[8%] z-[2] flex items-center gap-2.5 border border-white/10 bg-[#14231fbb] px-[13px] py-2.5 pl-2.5 backdrop-blur-[10px] max-[760px]:bottom-[7%] max-[760px]:left-[5%]">
            <span className="grid size-[29px] place-items-center bg-lime text-[#253327]"><Icon name="arrow" size={17} /></span>
            <span>
              <strong className="block text-[10px]">Relationships first.</strong>
              <small className="mt-[3px] block text-[9px] text-[#aebbb1]">Every mile of the way.</small>
            </span>
          </div>
          <div className="absolute bottom-[19px] right-8 z-[2] font-mono text-[9px] tracking-wide text-[#86958b] max-[760px]:bottom-4 max-[760px]:right-[17px]">DB / 2026</div>
        </div>

        <div className="absolute bottom-6 left-[7.1%] right-[7.1%] flex items-center gap-[19px] font-mono text-[8px] tracking-[1.4px] text-[#87988e] max-[760px]:bottom-[22px] max-[760px]:left-[23px] max-[760px]:right-[23px] max-[760px]:gap-[11px] max-[760px]:text-[7px] max-[390px]:gap-2">
          <span className="max-[390px]:hidden">BUILT FOR THE ROAD AHEAD</span>
          <span className="h-px flex-1 bg-[#52625a] max-[390px]:hidden" />
          <span className="whitespace-nowrap">SCROLL TO EXPLORE <b className="pl-[5px] text-[13px] font-normal text-lime">↓</b></span>
        </div>
      </section>

      <section className="bg-[#f7f8f3] px-[9.1%] pb-[116px] pt-[113px] max-[1050px]:px-[6%] max-[760px]:px-[23px] max-[760px]:pb-[77px] max-[760px]:pt-[73px]" id="features">
        <div className="font-mono text-[9px] tracking-[1.4px] text-[#768078]">A LITTLE MORE CONNECTION. A LOT LESS CHAOS.</div>
        <div className="mb-[43px] mt-[18px] flex items-end justify-between gap-8 max-[760px]:mb-[27px] max-[760px]:mt-4 max-[760px]:block">
          <h2 className="m-0 font-display text-[clamp(37px,4.4vw,57px)] font-semibold leading-[1.12] tracking-[-3px] max-[760px]:text-[42px] max-[760px]:tracking-[-2.4px] max-[390px]:text-[37px]">
            Good service starts<br />with <span className="text-[#79aa42]">knowing their name.</span>
          </h2>
          <p className="mb-[7px] max-w-[270px] text-[13px] leading-[1.8] text-[#7b837e] max-[760px]:mt-3.5">
            From first hello to their next set of keys, keep every detail in the right gear.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-[15px] max-[760px]:grid-cols-1 max-[760px]:gap-[11px]">
          <article className="relative min-h-[282px] overflow-hidden bg-forest p-6 px-[25px] text-white max-[760px]:min-h-[250px] max-[760px]:p-[22px]">
            <div className="font-mono text-[8px] tracking-[1.4px] text-[#9aa69d]">01 / REMEMBER</div>
            <div className="mb-[19px] mt-[31px] grid size-[45px] place-items-center rounded-full bg-[#bedf8e] text-[25px] text-[#1f3224] max-[760px]:mt-[23px]">✳</div>
            <h3 className="mb-2.5 font-display text-[19px] font-semibold tracking-[-0.6px]">People, not paperwork.</h3>
            <p className="m-0 max-w-[260px] text-[11px] leading-[1.8] text-[#aebbb2]">Keep names, numbers, vehicle interests, and those little details that make every follow-up feel personal.</p>
            <span className="absolute bottom-6 right-6 text-xl text-[#b7c2ba]">↗</span>
          </article>
          <article className="relative min-h-[282px] overflow-hidden bg-[#d8f5b6] p-6 px-[25px] max-[760px]:min-h-[250px] max-[760px]:p-[22px]">
            <div className="font-mono text-[8px] tracking-[1.4px] text-[#707b70]">02 / STAY IN GEAR</div>
            <div className="mb-[19px] mt-[31px] grid size-[45px] place-items-center text-[31px] text-[#23422d] max-[760px]:mt-[23px]">↗</div>
            <h3 className="mb-2.5 font-display text-[19px] font-semibold tracking-[-0.6px]">Never miss a moment.</h3>
            <p className="m-0 max-w-[260px] text-[11px] leading-[1.8] text-[#5b675e]">Know who&apos;s just browsing, who&apos;s ready to test drive, and who&apos;s already headed home happy.</p>
            <span className="absolute bottom-6 right-6 text-xl text-[#5c7755]">↗</span>
          </article>
          <article className="relative min-h-[282px] overflow-hidden bg-[#eaede5] p-6 px-[25px] max-[760px]:min-h-[250px] max-[760px]:p-[22px]">
            <div className="font-mono text-[8px] tracking-[1.4px] text-[#707b70]">03 / KEEP IT SIMPLE</div>
            <div className="mb-[19px] mt-[31px] grid size-[45px] place-items-center rounded-full border border-[#b9c2b4] text-[#496349] max-[760px]:mt-[23px]"><Icon name="users" size={25} /></div>
            <h3 className="mb-2.5 font-display text-[19px] font-semibold tracking-[-0.6px]">Your whole garage, organized.</h3>
            <p className="m-0 max-w-[260px] text-[11px] leading-[1.8] text-[#5b675e]">One clear view of every customer relationship. Easy to update, easy to find, easy to love.</p>
            <span className="absolute bottom-6 right-6 text-xl text-[#5c7755]">↗</span>
          </article>
        </div>
      </section>

      <section className="grid grid-cols-[.9fr_1.1fr] gap-[10%] bg-[#e8ece4] px-[11%] pb-[107px] pt-[101px] max-[1050px]:gap-[7%] max-[1050px]:px-[7%] max-[760px]:grid-cols-1 max-[760px]:gap-[38px] max-[760px]:px-[23px] max-[760px]:py-[73px]" id="how-it-works">
        <div>
          <div className="mb-[18px] font-mono text-[9px] tracking-[1.4px] text-[#768078]">LESS SPINNING YOUR WHEELS</div>
          <h2 className="m-0 font-display text-[clamp(40px,4.3vw,56px)] font-semibold leading-[1.12] tracking-[-3px] max-[760px]:text-[44px] max-[760px]:tracking-[-2.4px] max-[390px]:text-[37px]">
            Everything in its<br />right <span className="text-[#79aa42]">lane.</span>
          </h2>
          <p className="my-[19px] mb-[26px] max-w-[370px] text-[13px] leading-[1.9] text-[#6f7971]">
            A customer record should feel as smooth as a Sunday drive. Add a contact, keep their details up to date, and find exactly who you&apos;re looking for — all in a few clicks.
          </p>
          <Button className="min-h-[45px]" onClick={onAdmin}>See your dashboard <Icon name="arrow" size={16} /></Button>
        </div>
        <div className="self-center border-t border-[#c6cec3]">
          {[
            ["01", "Meet your next customer", "Add their details and the car that caught their eye."],
            ["02", "Keep the conversation rolling", "Update their status whenever the journey moves forward."],
            ["03", "Make the next visit personal", "See their history at a glance and pick up right where you left off."],
          ].map(([num, title, copy]) => (
            <div key={num} className="grid grid-cols-[38px_1fr_20px] items-start gap-[13px] border-b border-[#c6cec3] py-[21px] max-[760px]:py-[18px]">
              <span className="pt-[3px] font-mono text-[10px] text-[#79a845]">{num}</span>
              <div>
                <h3 className="mb-1.5 font-display text-sm font-semibold">{title}</h3>
                <p className="m-0 text-[11px] text-[#727d74]">{copy}</p>
              </div>
              <Icon name="chevron" size={18} className="mt-0.5 text-[#849084]" />
            </div>
          ))}
        </div>
      </section>

      <footer className="flex min-h-[90px] items-center justify-between bg-forest px-[7.1%] py-[17px] text-[10px] text-[#a8b5ac] max-[760px]:flex-wrap max-[760px]:gap-[18px] max-[760px]:px-[23px] max-[760px]:py-[22px]">
        <Brand className="text-[17px] text-white max-[760px]:text-base" markClassName="w-[31px] text-lime [&>svg]:h-auto [&>svg]:w-[29px]" />
        <span className="max-[760px]:hidden">Made for the people who move us.</span>
        <button className="flex items-center gap-2 border-0 bg-transparent text-[10px] text-white hover:text-lime" onClick={onAdmin}>
          Admin portal <Icon name="arrow" size={14} />
        </button>
        <span>© 2026 Drivebase</span>
      </footer>
    </main>
  );
}

function CarMark({ className = "h-[22px] w-8" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 34 22" fill="none">
      <path d="M3 14.5 6 8h5l3.5-4h7L25 8h4l3 4v5h-4a3.5 3.5 0 0 0-7 0h-9a3.5 3.5 0 0 0-7 0H3v-2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="8.5" cy="17" r="2.5" fill="currentColor" />
      <circle cx="24.5" cy="17" r="2.5" fill="currentColor" />
    </svg>
  );
}

function authErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Those details don't match a Firebase admin account.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    default:
      return error?.message || "Sign-in failed. Check your Firebase setup.";
  }
}

function LoginPage({ onLogin, onHome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!isFirebaseConfigured || !auth) {
      setError("Firebase is not configured yet. Add your web app keys to .env.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLogin();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-2 bg-[#f8f9f5] max-[760px]:grid-cols-1">
      <div className="relative flex min-h-screen items-center overflow-hidden bg-forest px-[9%] text-white max-[760px]:hidden">
        <div aria-hidden="true" className="absolute right-[-170px] top-[15%] size-[540px] rounded-full border border-[#d7f9c61a]" />
        <div aria-hidden="true" className="absolute right-[-95px] top-[25%] size-[390px] rounded-full border border-[#d7f9c61a]" />
        <div aria-hidden="true" className="absolute right-[-28%] top-[49%] h-60 w-[130%] -rotate-[18deg] rounded-full border border-[#c6f19e18]" />
        <div className="relative z-[1] max-w-[430px]">
          <span className="font-mono text-[9px] tracking-[1.4px] text-lime">DRIVEBASE / ADMIN</span>
          <h2 className="my-8 mb-[17px] font-display text-[clamp(42px,5vw,66px)] font-medium leading-[1.12] tracking-[-3px]">
            Good to have<br />you in the<br /><em className="not-italic text-lime">driver&apos;s seat.</em>
          </h2>
          <p className="text-[13px] text-[#a9b7ad]">One place for every customer relationship.</p>
          <div className="mt-[67px] text-[#b9f471] opacity-80"><CarMark className="h-[135px] w-[210px]" /></div>
        </div>
        <span className="absolute bottom-[35px] left-[9%] font-mono text-[8px] tracking-[1.4px] text-[#829188]">A BETTER DRIVE, TOGETHER — 2026</span>
      </div>

      <section className="flex min-h-screen flex-col items-center px-[9%] pb-7 pt-[37px] max-[760px]:px-[25px] max-[760px]:pb-5 max-[760px]:pt-[25px]">
        <a
          className="inline-flex items-center gap-2.5 self-end font-display text-[17px] font-extrabold tracking-[-1.1px] max-[760px]:self-start"
          href="/"
          onClick={(event) => { event.preventDefault(); onHome(); }}
        >
          <span className="grid h-[30px] w-[31px] place-items-center text-[#263a31]"><CarMark className="h-auto w-[29px]" /></span>
          <span>drivebase<span className="text-[#78b83e]">.</span></span>
        </a>
        <div className="my-auto w-full max-w-[390px] py-[45px]">
          <div className="flex items-center gap-[9px] font-mono text-[9px] tracking-[1.4px] text-[#77817a]">
            <span className="size-[7px] rounded-full bg-[#83bd49]" /> FIREBASE ADMIN ACCESS
          </div>
          <h1 className="mb-[7px] mt-[19px] font-display text-4xl font-bold tracking-[-1.6px]">Welcome back.</h1>
          <p className="mb-[31px] text-[13px] text-muted">Sign in with your Firebase Auth account.</p>
          {!isFirebaseConfigured && (
            <p className="mb-5 border-l-2 border-[#c75f50] bg-[#fff2ef] px-[11px] py-[9px] text-[11px] leading-[1.6] text-[#a24238]" role="status">
              Firebase keys are missing. Copy your web app config into <code>.env</code> (see <code>.env.example</code>).
            </p>
          )}
          <form onSubmit={submit}>
            <label className="mb-2 block text-[11px] font-bold text-[#323a35]" htmlFor="email">Email address</label>
            <input
              className="mb-[19px] h-12 w-full rounded border border-[#dce1d9] bg-white px-[13px] text-xs text-ink outline-none transition-[border,box-shadow] duration-200 placeholder:text-[#a6ada7] focus:border-[#86b84e] focus:shadow-[0_0_0_3px_#a7da6c29]"
              id="email"
              type="email"
              autoComplete="username"
              placeholder="you@dealership.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label className="mb-2 block text-[11px] font-bold text-[#323a35]" htmlFor="password">Password</label>
            <input
              className="mb-[19px] h-12 w-full rounded border border-[#dce1d9] bg-white px-[13px] text-xs text-ink outline-none transition-[border,box-shadow] duration-200 placeholder:text-[#a6ada7] focus:border-[#86b84e] focus:shadow-[0_0_0_3px_#a7da6c29]"
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && <p className="border-l-2 border-[#c75f50] bg-[#fff2ef] px-[11px] py-[9px] text-[11px] leading-[1.6] text-[#a24238]" role="alert">{error}</p>}
            <Button variant="lime" className="mt-[5px] w-full" type="submit" disabled={busy || !isFirebaseConfigured}>
              {busy ? "Signing in…" : <>Sign in to Drivebase <Icon name="arrow" size={17} /></>}
            </Button>
          </form>
          <div className="mt-[23px] border border-[#e0e7d8] bg-[#f2f7ec] p-[13px] text-[10px] leading-[1.7] text-[#49534b]">
            Sign in with an account enabled for this Firebase project. Create or manage accounts in Firebase Authentication.
          </div>
          <p className="mt-[22px] text-center">
            <button className="border-0 bg-transparent text-[11px] text-[#727d74] hover:text-[#3e7525]" onClick={onHome}>← Back to the homepage</button>
          </p>
        </div>
        <p className="mt-auto text-[9px] text-[#89918b]">Powered by Firebase Auth · Customer data in Firestore</p>
      </section>
    </main>
  );
}

function Dashboard({ user, onLogout }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All records");
  const [editing, setEditing] = useState(null);
  const [actionCustomer, setActionCustomer] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;

    async function start() {
      try {
        unsub = subscribeCustomers(
          (rows) => {
            setCustomers(rows);
            setLoading(false);
          },
          (err) => {
            console.error(err);
            setNotice(err.message || "Could not load customers from Firestore.");
            setLoading(false);
          }
        );
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setNotice(err.message || "Could not connect to Firestore.");
          setLoading(false);
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const haystack = [
      customer.certificateNumber,
      customer.makeBodyType,
      customer.importerName,
      customer.declarationNumber,
      customer.model,
      customer.country,
      customer.chassisNo,
      customer.engineNo,
      customer.color,
      customer.remarks,
      customer.userId,
      customer.status,
    ].join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === "All records" || customer.status === statusFilter);
  }), [customers, search, statusFilter]);

  const pending = customers.filter((customer) => customer.status === "Pending").length;
  const cleared = customers.filter((customer) => customer.status === "Cleared").length;
  const adminLabel = user?.email?.split("@")[0] || "Admin";
  const adminInitials = adminLabel.slice(0, 2).toUpperCase();
  const currentUserId = user?.email || user?.uid || "";

  async function copyCustomerLink(customer) {
    const link = new URL(`/record/${encodeURIComponent(customer.id)}`, window.location.origin).toString();
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(link);
      setNotice("Record link copied.");
    } catch (err) {
      console.error(err);
      setNotice("Could not copy the record link. Check browser clipboard permissions.");
    }
    window.setTimeout(() => setNotice(""), 3200);
  }

  async function saveCustomer(customer) {
    try {
      const payload = { ...customerPayload(customer), userId: customer.userId || currentUserId };
      if (customer.id) await updateCustomer({ ...payload, id: customer.id });
      else await createCustomer(payload);
      setEditing(null);
      setNotice(customer.id ? "Record updated." : "Record added.");
      window.setTimeout(() => setNotice(""), 2800);
    } catch (err) {
      setNotice(err.message || "Could not save record.");
      window.setTimeout(() => setNotice(""), 3200);
    }
  }

  async function deleteCustomer(customer) {
    const label = customer.certificateNumber || customer.chassisNo || "this record";
    setDeleteBusy(true);
    try {
      await removeCustomer(customer.id);
      setDeleting(null);
      setNotice(`${label} was deleted.`);
      window.setTimeout(() => setNotice(""), 2800);
    } catch (err) {
      setNotice(err.message || "Could not delete record.");
      window.setTimeout(() => setNotice(""), 3200);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#f5f6f2] text-[#19231e]">
      <aside className="fixed inset-y-0 left-0 z-[5] flex w-[236px] flex-col bg-forest px-4 pb-[15px] pt-[25px] text-white max-[1050px]:w-[205px] max-[760px]:w-[62px] max-[760px]:items-center max-[760px]:px-[7px] max-[760px]:pb-2.5 max-[760px]:pt-[19px]">
        <a className="mb-[52px] inline-flex items-center gap-2.5 pl-2 font-display text-[19px] font-extrabold tracking-[-1.1px] text-white max-[760px]:mb-[37px] max-[760px]:p-0" href="/">
          <span className="grid h-[30px] w-[31px] place-items-center text-lime"><CarMark className="h-auto w-[29px]" /></span>
          <span className="max-[760px]:hidden">drivebase<span className="text-[#78b83e]">.</span></span>
        </a>
        <div className="mb-3 px-[11px] font-mono text-[8px] tracking-[1.4px] text-[#73827a] max-[760px]:hidden">WORKSPACE</div>
        <button className="my-0.5 flex h-[43px] items-center gap-3 rounded border-0 bg-[#273a32] px-[11px] text-left text-xs text-white shadow-[inset_2px_0_#bbf36b] max-[760px]:w-11 max-[760px]:justify-center max-[760px]:px-0 max-[760px]:shadow-none max-[760px]:text-[0px]">
          <Icon name="dashboard" /> <span className="max-[760px]:hidden">Overview</span>
        </button>
        <button
          className="my-0.5 flex h-[43px] items-center gap-3 rounded border-0 bg-transparent px-[11px] text-left text-xs text-[#aebbb2] hover:bg-[#273a32] hover:text-white max-[760px]:hidden"
          onClick={() => document.getElementById("customer-search")?.focus()}
        >
          <Icon name="users" /> Customers <span className="ml-auto rounded-[10px] bg-[#405244] px-[7px] py-[3px] text-[9px] text-[#a9bd9b]">{customers.length}</span>
        </button>
        <div className="mt-auto">
          <div className="flex items-center gap-2.5 border-t border-[#304039] px-0.5 pb-[15px] pt-[17px] max-[760px]:justify-center max-[760px]:pt-[15px]">
            <div className="grid size-[31px] place-items-center rounded-full bg-[#d5eeac] text-[9px] font-bold text-[#31472b]">{adminInitials}</div>
            <div className="max-[760px]:hidden">
              <strong className="block text-[10px]">{adminLabel}</strong>
              <span className="mt-1 block max-w-[120px] truncate text-[9px] text-[#87968c]">{user?.email || "Administrator"}</span>
            </div>
            <button className="ml-auto border-0 bg-transparent p-[5px] text-[#9eaca2] hover:text-lime max-[760px]:hidden" aria-label="Sign out" onClick={onLogout}>
              <Icon name="logout" size={17} />
            </button>
          </div>
          <div className="border-t border-[#304039] px-[3px] pb-px pt-[13px] font-mono text-[7px] tracking-wide text-[#85958a] max-[760px]:hidden">
            FIREBASE <span className="float-right text-[#bddc9e]">LIVE</span>
          </div>
        </div>
      </aside>

      <section className="ml-[236px] w-[calc(100%-236px)] max-[1050px]:ml-[205px] max-[1050px]:w-[calc(100%-205px)] max-[760px]:ml-[62px] max-[760px]:w-[calc(100%-62px)]">
        <header className="flex h-[65px] items-center justify-between border-b border-[#e2e5dd] bg-[#fafbf8] px-[4.1%] max-[760px]:h-[57px] max-[760px]:px-[15px]">
          <div className="flex items-center gap-[9px] text-[10px] text-[#929a93]">
            Workspace <Icon name="chevron" size={14} /> <strong className="font-semibold text-[#3a453e]">Overview</strong>
          </div>
          <div className="flex items-center gap-[17px] max-[760px]:gap-2">
            <span className="text-[10px] text-[#818981] max-[760px]:hidden">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
            <div className="grid size-[29px] place-items-center rounded-full bg-[#d5eeac] text-[9px] font-bold text-[#31472b]">{adminInitials}</div>
            <button className="hidden place-items-center border-0 bg-transparent p-[5px] text-[#748078] max-[760px]:grid" onClick={onLogout}>
              <Icon name="logout" size={17} />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1240px] px-[4.1%] pb-[25px] pt-[38px] max-[1050px]:px-[3%] max-[760px]:px-[15px] max-[760px]:pb-5 max-[760px]:pt-[27px]">
          <div className="mb-[23px] flex items-center justify-between max-[760px]:items-start max-[760px]:gap-2.5 max-[390px]:flex-col">
            <div className="max-[390px]:w-full">
              <div className="font-mono text-[8px] tracking-wide text-[#829087]">TUESDAY, OCTOBER 27, 2026</div>
              <h1 className="mb-[5px] mt-[7px] font-display text-[30px] font-bold tracking-[-1.2px] max-[760px]:text-2xl">Vehicle records</h1>
              <p className="m-0 text-[11px] text-[#7a847d] max-[760px]:max-w-[230px] max-[760px]:leading-normal">Certificate, chassis, importer, and clearance details in one place.</p>
            </div>
            <Button
              className="min-h-[42px] px-[15px] text-[11px] max-[760px]:min-h-[38px] max-[760px]:gap-[5px] max-[760px]:whitespace-nowrap max-[760px]:px-2.5 max-[760px]:text-[9px] max-[390px]:self-start"
              onClick={() => setEditing(emptyCustomer(currentUserId))}
            >
              <Icon name="plus" size={17} /> Add record
            </Button>
          </div>

          <div className="mb-[25px] grid grid-cols-4 gap-3 max-[1050px]:gap-2 max-[760px]:grid-cols-2 max-[760px]:gap-2">
            <article className="min-h-[135px] border border-[#e2e6de] bg-[#fbfcf9] p-[15px] max-[1050px]:p-3 max-[760px]:min-h-[118px] max-[390px]:p-2.5">
              <div className="flex items-center justify-between text-[10px] text-[#68736b] max-[390px]:text-[9px]">
                <span>Total records</span>
                <span className="grid size-[27px] place-items-center rounded-full bg-[#edf3e7] text-[#628449]"><Icon name="users" size={17} /></span>
              </div>
              <strong className="mt-[11px] block font-display text-[26px] font-bold tracking-[-0.8px]">{customers.length}</strong>
              <span className="mt-1 block text-[9px] text-[#8a938b]"><span className="text-[#5d8c3d]">All certificates</span></span>
            </article>
            <article className="min-h-[135px] border border-[#e2e6de] bg-[#fbfcf9] p-[15px] max-[1050px]:p-3 max-[760px]:min-h-[118px] max-[390px]:p-2.5">
              <div className="flex items-center justify-between text-[10px] text-[#68736b] max-[390px]:text-[9px]">
                <span>Pending</span>
                <span className="grid size-[27px] place-items-center rounded-full bg-[#eff7df] text-[18px] text-[#56852b]">↗</span>
              </div>
              <strong className="mt-[11px] block font-display text-[26px] font-bold tracking-[-0.8px]">{pending}</strong>
              <span className="mt-1 block text-[9px] text-[#8a938b]">Awaiting clearance</span>
            </article>
            <article className="min-h-[135px] border border-[#e2e6de] bg-[#fbfcf9] p-[15px] max-[1050px]:p-3 max-[760px]:min-h-[118px] max-[390px]:p-2.5">
              <div className="flex items-center justify-between text-[10px] text-[#68736b] max-[390px]:text-[9px]">
                <span>Cleared</span>
                <span className="grid size-[27px] place-items-center rounded-full bg-[#e5f3e9] text-[#3a8053]"><Icon name="check" size={17} /></span>
              </div>
              <strong className="mt-[11px] block font-display text-[26px] font-bold tracking-[-0.8px]">{cleared}</strong>
              <span className="mt-1 block text-[9px] text-[#8a938b]">Ready to move</span>
            </article>
            <article className="min-h-[135px] border border-[#d9f3bd] bg-[#d9f3bd] p-[15px] max-[1050px]:p-3 max-[760px]:min-h-[118px] max-[390px]:p-2.5">
              <div className="flex items-center justify-between text-[10px] text-[#4e6547] max-[390px]:text-[9px]">
                <span>Keep the momentum</span>
                <span className="grid size-[27px] place-items-center rounded-full bg-[#405c44] text-white"><Icon name="arrow" size={16} /></span>
              </div>
              <strong className="mt-2 block font-display text-[17px] font-bold leading-[1.2] tracking-[-0.4px] max-[760px]:text-[15px]">Every chassis<br />tracked.</strong>
              <span className="mt-[5px] block text-[9px] text-[#5e7554]">Import records, cleared cleanly.</span>
            </article>
          </div>

          <section className="border border-[#e1e5dd] bg-[#fbfcf9]">
            <div className="flex items-center justify-between px-5 pb-[15px] pt-[18px] max-[760px]:px-3 max-[760px]:pb-3 max-[760px]:pt-[15px]">
              <div>
                <h2 className="mb-[5px] font-display text-sm font-bold tracking-[-0.3px] max-[760px]:text-[13px]">Import records</h2>
                <p className="m-0 text-[10px] text-[#879088] max-[760px]:text-[9px]">Certificate, chassis, engine, and status details.</p>
              </div>
              <span className="bg-[#f0f3ed] px-[9px] py-[7px] font-mono text-[7px] tracking-wide text-[#7e897f] max-[760px]:px-1.5 max-[760px]:py-1.5 max-[760px]:text-[6px]">
                {filteredCustomers.length} RECORDS
              </span>
            </div>
            <div className="flex gap-[9px] px-5 pb-[13px] max-[760px]:px-3 max-[760px]:pb-[11px]">
              <label className="flex h-9 max-w-[370px] flex-1 items-center gap-2 border border-[#e1e5dd] bg-white px-2.5 text-[#98a199] focus-within:border-[#9abf70] focus-within:shadow-[0_0_0_2px_#b4d79429] max-[760px]:h-[34px]" htmlFor="customer-search">
                <Icon name="search" size={18} />
                <input
                  className="min-w-0 w-full border-0 bg-transparent text-[10px] text-[#303a33] outline-none placeholder:text-[#a0a8a1]"
                  id="customer-search"
                  type="search"
                  placeholder="Search certificate, chassis, importer..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">Filter records by status</span>
                <select
                  className="h-9 min-w-[132px] border border-[#e1e5dd] bg-white py-0 pl-2.5 pr-[27px] text-[10px] text-[#667168] outline-none max-[760px]:max-w-[117px] max-[760px]:min-w-[100px] max-[760px]:pl-[7px] max-[760px]:text-[9px]"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option>All records</option>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Cleared</option>
                  <option>Hold</option>
                </select>
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr>
                    {["CERTIFICATE", "MAKE / MODEL", "IMPORTER", "CHASSIS NO", "STATUS", "DATE"].map((heading) => (
                      <th key={heading} className="h-[37px] border-y border-[#e9ece6] bg-[#f6f8f3] px-[15px] text-left font-mono text-[7px] font-normal tracking-[0.9px] text-[#8c968e] first:pl-5 last:pr-[17px] max-[760px]:first:pl-3">
                        {heading}
                      </th>
                    ))}
                    <th className="h-[37px] w-[75px] border-y border-[#e9ece6] bg-[#f6f8f3] px-[15px] pr-[17px] text-left font-mono text-[7px] font-normal tracking-[0.9px] text-[#8c968e]">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td className="border-b border-[#edf0ea] p-0" colSpan="7">
                        <div className="px-2.5 py-8 text-center font-mono text-[10px] tracking-[1.2px] text-[#819083]">
                          LOADING RECORDS FROM FIRESTORE…
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading && filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="h-[62px] border-b border-[#edf0ea] px-[15px] text-[10px] first:pl-5 max-[760px]:px-2.5 max-[760px]:first:pl-3">
                        <strong className="block text-[10px] font-semibold text-[#28342d]">{customer.certificateNumber || "—"}</strong>
                        <small className="mt-1 block text-[9px] text-[#929a93]">{customer.declarationNumber || "No declaration"}</small>
                      </td>
                      <td className="h-[62px] border-b border-[#edf0ea] px-[15px] text-[10px] max-[760px]:px-2.5">
                        <div className="whitespace-nowrap text-[10px] text-[#46534a]">
                          {customer.makeBodyType || "—"}
                          <small className="mt-1 block text-[9px] text-[#9aa29b]">{customer.model || "—"} · {customer.color || "—"}</small>
                        </div>
                      </td>
                      <td className="h-[62px] border-b border-[#edf0ea] px-[15px] text-[10px] max-[760px]:px-2.5">
                        <div className="text-[10px] text-[#46534a]">
                          {customer.importerName || "—"}
                          <small className="mt-1 block text-[9px] text-[#9aa29b]">{customer.country || "—"}</small>
                        </div>
                      </td>
                      <td className="h-[62px] border-b border-[#edf0ea] px-[15px] font-mono text-[9px] text-[#46534a] max-[760px]:px-2.5">
                        <div>
                          {customer.chassisNo || "—"}
                          <small className="mt-1 block text-[9px] text-[#9aa29b]">Eng: {customer.engineNo || "—"}</small>
                        </div>
                      </td>
                      <td className="h-[62px] border-b border-[#edf0ea] px-[15px] text-[10px] max-[760px]:px-2.5">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-[5px] text-[8px] ${statusStyles[customer.status] || statusStyles.Pending}`}>
                          <span className="size-[5px] rounded-full bg-current" />
                          {customer.status}
                        </span>
                      </td>
                      <td className="h-[62px] whitespace-nowrap border-b border-[#edf0ea] px-[15px] text-[9px] text-[#828c84] max-[760px]:px-2.5">
                        {customer.dateLabel || customer.date || "—"}
                      </td>
                      <td className="h-[62px] border-b border-[#edf0ea] px-[15px] pr-[17px] text-[10px] max-[760px]:px-2.5">
                        <div className="relative flex justify-end">
                          <button
                            className="inline-flex h-[31px] items-center gap-1 rounded border border-[#dce2d9] bg-white px-2.5 text-[10px] font-semibold text-[#536158] hover:border-[#afc69d] hover:bg-[#f5f8f1]"
                            aria-haspopup="dialog"
                            aria-label={`Actions for ${customer.certificateNumber || "record"}`}
                            onClick={(event) => setActionCustomer({ customer, anchor: event.currentTarget })}
                          >
                            Action <Icon name="chevron" size={13} className="rotate-90" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredCustomers.length === 0 && (
                    <tr>
                      <td className="border-b border-[#edf0ea] p-0" colSpan="7">
                        <div className="px-2.5 py-8 text-center text-[#819083]">
                          <span className="block text-[28px]">⌕</span>
                          <strong className="mt-2 block text-xs text-[#354239]">No records found</strong>
                          <p className="text-[10px]">Try another search or add a new vehicle record.</p>
                          <button className="border-0 bg-transparent text-[10px] font-semibold text-[#5e8d38]" onClick={() => { setSearch(""); setStatusFilter("All records"); }}>Clear filters</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between px-5 py-3 text-[9px] text-[#929b93] max-[760px]:px-3 max-[760px]:py-[11px] max-[760px]:text-[8px]">
              <span>Showing <strong className="font-semibold text-[#667169]">{filteredCustomers.length}</strong> of <strong className="font-semibold text-[#667169]">{customers.length}</strong> records</span>
              <span>Updated just now <span className="ml-[5px] inline-block size-[5px] align-[1px] rounded-full bg-[#81b94b]" /></span>
            </div>
          </section>

          <footer className="flex justify-between py-[19px] font-mono text-[7px] tracking-[0.8px] text-[#9aa39b] max-[760px]:flex-col max-[760px]:gap-[7px] max-[760px]:leading-normal">
            <span>DRIVEBASE / KEEP GOOD COMPANY.</span>
            <span>Synced with Cloud Firestore.</span>
          </footer>
        </div>
      </section>

      {notice && (
        <div className="fixed bottom-6 right-[25px] z-30 flex animate-toast-in items-center gap-2.5 bg-[#192a24] py-3 pl-[11px] pr-4 text-[11px] text-white shadow-[0_8px_30px_#0a1b1030] max-[760px]:inset-x-3 max-[760px]:bottom-3 max-[760px]:right-3" role="status">
          <span className="grid size-6 place-items-center rounded-full bg-[#bff079] text-[#30472d]"><Icon name="check" size={16} /></span>
          {notice}
        </div>
      )}
      {editing && <CustomerForm customer={editing} onSave={saveCustomer} onClose={() => setEditing(null)} />}
      {actionCustomer && (
        <CustomerActionsModal
          customer={actionCustomer.customer}
          anchor={actionCustomer.anchor}
          onClose={() => setActionCustomer(null)}
          onView={() => { setViewing(actionCustomer.customer); setActionCustomer(null); }}
          onEdit={() => { setEditing({ ...actionCustomer.customer }); setActionCustomer(null); }}
          onDelete={() => { setDeleting(actionCustomer.customer); setActionCustomer(null); }}
          onCopyLink={() => { copyCustomerLink(actionCustomer.customer); setActionCustomer(null); }}
        />
      )}
      {viewing && (
        <CustomerDetailsModal
          customer={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing({ ...viewing }); setViewing(null); }}
        />
      )}
      {deleting && (
        <DeleteCustomerModal
          customer={deleting}
          busy={deleteBusy}
          onCancel={() => { if (!deleteBusy) setDeleting(null); }}
          onConfirm={() => deleteCustomer(deleting)}
        />
      )}
    </main>
  );
}

function CustomerActionsModal({ customer, anchor, onClose, onView, onEdit, onDelete, onCopyLink }) {
  const [position, setPosition] = useState(null);
  const label = customer.certificateNumber || customer.chassisNo || "Customer record";

  useEffect(() => {
    function updatePosition() {
      if (!anchor?.isConnected) {
        onClose();
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const panelWidth = 188;
      const panelHeight = 214;
      const gap = 6;
      const left = Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8));
      const top = rect.bottom + panelHeight + gap <= window.innerHeight - 8
        ? rect.bottom + gap
        : Math.max(8, rect.top - panelHeight - gap);
      setPosition({ left, top });
    }

    function handleOutsideClick(event) {
      const target = event.target;
      const isInsidePanel = target instanceof Element && target.closest("[data-customer-actions]");
      if (!isInsidePanel && !anchor?.contains(target)) onClose();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchor]);

  if (!position) return null;

  return createPortal(
    <div
      data-customer-actions
      className="z-50 w-[188px] rounded-md border border-[#e1e6dd] bg-[#fbfcf9] p-2 shadow-[0_12px_36px_#12231d30]"
      style={{ position: "fixed", left: position.left, top: position.top }}
      role="dialog"
      aria-label={`Actions for ${label}`}
    >
      <div className="mb-1 truncate px-2 py-1 font-mono text-[8px] tracking-wide text-[#89948b]" title={label}>{label}</div>
      <button className="flex min-h-9 w-full items-center rounded px-2 text-left text-[11px] font-semibold text-[#48564c] hover:bg-[#f2f6ee]" onClick={onView}>
        View record
      </button>
      <button className="flex min-h-9 w-full items-center rounded px-2 text-left text-[11px] font-semibold text-[#48564c] hover:bg-[#f2f6ee]" onClick={onEdit}>
        Edit record
      </button>
      <button className="flex min-h-9 w-full items-center rounded px-2 text-left text-[11px] font-semibold text-[#a24238] hover:bg-[#fff2ef]" onClick={onDelete}>
        Delete record
      </button>
      <button className="flex min-h-9 w-full items-center rounded px-2 text-left text-[11px] font-semibold text-[#48564c] hover:bg-[#f2f6ee]" onClick={onCopyLink}>
        Copy record URL
      </button>
    </div>,
    document.body
  );
}

function CustomerRecordPage({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    const previousHtmlBg = document.documentElement.style.backgroundColor;
    const previousBodyBg = document.body.style.backgroundColor;
    document.title = "Vehicle Certificate Details";
    document.documentElement.style.backgroundColor = "#ffffff";
    document.body.style.backgroundColor = "#ffffff";
    return () => {
      document.title = previousTitle;
      document.documentElement.style.backgroundColor = previousHtmlBg;
      document.body.style.backgroundColor = previousBodyBg;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomer() {
      try {
        if (!customerId) throw new Error("The record link is invalid.");
        const result = await getCustomerById(customerId);
        if (!result) throw new Error("This customer record could not be found.");
        if (!cancelled) setCustomer(result);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err.message || "Could not load this customer record.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCustomer();
    return () => { cancelled = true; };
  }, [customerId]);

  const rows = customer
    ? certificateFields.map(([key, label, arabic]) => ({
      label,
      value: key === "date" ? customer.dateLabel || customer.date : customer[key],
      arabic,
      status: key === "status" && ["VALID", "INVALID", "CLEARED", "HOLD"].includes(customer.status?.toUpperCase()),
    }))
    : [];

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", width: "100%", margin: 0, background: "#ffffff", fontFamily: certificateFont, WebkitFontSmoothing: "antialiased" }}>
        <div style={{ boxSizing: "border-box", width: "100%", maxWidth: "600px", margin: "0 auto", padding: "0 12px" }}>
          <div style={{ marginTop: "3.25rem", textAlign: "center" }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.5rem", padding: 0, fontFamily: certificateFont, fontSize: "1.75rem", fontWeight: 500, lineHeight: 1.2, color: "#000000", letterSpacing: "normal" }}>
              Vehicle Certificate Details
            </h3>
            <p lang="ar" dir="rtl" style={{ margin: "8px 0 0", padding: 0, fontFamily: certificateFont, fontSize: "24px", fontWeight: 400, lineHeight: "30px", color: "#000000" }}>
              تفاصيل شهادة المركبة
            </p>
          </div>
          <p style={{ margin: "18px 0", textAlign: "center", fontSize: "14px", color: "#000000" }} role="status">Loading vehicle record…</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", width: "100%", margin: 0, background: "#ffffff", fontFamily: certificateFont, WebkitFontSmoothing: "antialiased" }}>
      <div style={{ boxSizing: "border-box", width: "100%", maxWidth: "600px", margin: "0 auto", padding: "0 12px" }}>
        <div style={{ marginTop: "3.25rem", textAlign: "center" }}>
          <h3 style={{ marginTop: 0, marginBottom: "0.5rem", padding: 0, fontFamily: certificateFont, fontSize: "1.75rem", fontWeight: 500, lineHeight: 1.2, color: "#000000", letterSpacing: "normal" }}>
            Vehicle Certificate Details
          </h3>
          <p lang="ar" dir="rtl" style={{ margin: "8px 0 0", padding: 0, fontFamily: certificateFont, fontSize: "24px", fontWeight: 400, lineHeight: "30px", color: "#000000" }}>
            تفاصيل شهادة المركبة
          </p>
        </div>
        {error ? (
          <p style={{ margin: "18px 0", textAlign: "center", fontSize: "14px", color: "#a35248" }} role="alert">{error}</p>
        ) : !customer ? (
          <p style={{ margin: "18px 0", textAlign: "center", fontSize: "14px", color: "#000000" }} role="status">This vehicle record could not be found.</p>
        ) : (
          <table style={{ width: "100%", marginTop: "16px", borderCollapse: "collapse", borderSpacing: 0, tableLayout: "fixed", border: `1px solid ${certificateBorder}`, background: "#ffffff", fontFamily: certificateFont }}>
            <colgroup>
              <col style={{ width: "25%" }} />
              <col style={{ width: "50%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <thead>
              <tr>
                {[0, 1, 2].map((i) => (
                  <th key={i} style={{ height: "34px", padding: 0, backgroundColor: certificateGold, borderTop: `1px solid ${certificateGold}`, borderBottom: `1px solid ${certificateGold}`, borderLeft: i === 0 ? `1px solid ${certificateGold}` : "2px solid #fff", borderRight: i === 2 ? `1px solid ${certificateGold}` : "2px solid #fff", fontSize: 0, lineHeight: 0 }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" style={{ border: `1px solid ${certificateBorder}`, padding: "6px 8px", verticalAlign: "middle", textAlign: "left", fontFamily: certificateFont, fontSize: "14px", fontWeight: 400, lineHeight: "18px", color: "#000000", boxSizing: "border-box" }}>
                    {row.label}
                  </th>
                  <td style={{ border: `1px solid ${certificateBorder}`, padding: "6px 8px", verticalAlign: "middle", textAlign: "center", fontFamily: certificateFont, fontSize: "14px", fontWeight: 700, lineHeight: "18px", color: row.status ? "#a24238" : "#000000", whiteSpace: "normal", overflowWrap: "anywhere", boxSizing: "border-box" }}>
                    {row.value || ""}
                  </td>
                  <td lang="ar" dir="rtl" style={{ border: `1px solid ${certificateBorder}`, padding: "6px 8px", verticalAlign: "middle", textAlign: "right", fontFamily: certificateFont, fontSize: "14px", fontWeight: 400, lineHeight: "18px", color: "#000000", boxSizing: "border-box" }}>
                    {row.arabic}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function CustomerDetailsModal({ customer, onClose, onEdit }) {
  const fields = [
    ["Certificate Number", customer.certificateNumber],
    ["Date", customer.dateLabel || customer.date],
    ["Make / Body Type", customer.makeBodyType],
    ["Model", customer.model],
    ["Importer Name", customer.importerName],
    ["Declaration Number", customer.declarationNumber],
    ["Country", customer.country],
    ["Color", customer.color],
    ["Chassis No", customer.chassisNo],
    ["Engine No", customer.engineNo],
    ["User ID", customer.userId],
    ["Status", customer.status],
  ];

  return (
    <div className="fixed inset-0 z-20 grid animate-fade-in place-items-center bg-[#101c19a8] p-5 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[min(92vh,760px)] w-full max-w-[620px] overflow-y-auto bg-[#fbfcf9] px-[25px] py-[23px] shadow-[0_20px_70px_#0004] max-[760px]:px-[18px] max-[760px]:py-5" role="dialog" aria-modal="true" aria-labelledby="customer-details-title">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="font-mono text-[8px] tracking-wide text-[#829087]">VEHICLE RECORD</div>
            <h2 className="mt-[7px] font-display text-[22px] font-bold tracking-[-0.8px]" id="customer-details-title">Record details</h2>
          </div>
          <button className="border-0 bg-transparent p-1 text-[#7c867e] hover:text-[#18241e]" aria-label="Close record details" onClick={onClose}><Icon name="close" /></button>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 max-[520px]:grid-cols-1">
          {fields.map(([label, value]) => (
            <div key={label} className="border-b border-[#e9ede6] py-3">
              <dt className="mb-1 font-mono text-[8px] tracking-wide text-[#89948b]">{label}</dt>
              <dd className="m-0 break-words text-[11px] font-medium text-[#354239]">{value || "—"}</dd>
            </div>
          ))}
          <div className="col-span-2 border-b border-[#e9ede6] py-3 max-[520px]:col-span-1">
            <dt className="mb-1 font-mono text-[8px] tracking-wide text-[#89948b]">Remarks</dt>
            <dd className="m-0 whitespace-pre-wrap break-words text-[11px] text-[#354239]">{customer.remarks || "—"}</dd>
          </div>
        </dl>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-10 px-3.5 text-[10px]" onClick={onClose}>Close</Button>
          <Button type="button" className="min-h-10 px-3.5 text-[10px]" onClick={onEdit}><Icon name="edit" size={15} /> Edit record</Button>
        </div>
      </section>
    </div>
  );
}

function DeleteCustomerModal({ customer, busy, onCancel, onConfirm }) {
  const label = customer.certificateNumber || customer.chassisNo || "this record";

  return (
    <div className="fixed inset-0 z-20 grid animate-fade-in place-items-center bg-[#101c19a8] p-5 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="w-full max-w-[420px] bg-[#fbfcf9] px-[25px] py-[23px] shadow-[0_20px_70px_#0004] max-[760px]:px-[18px] max-[760px]:py-5" role="dialog" aria-modal="true" aria-labelledby="delete-customer-title">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="font-mono text-[8px] tracking-wide text-[#a24238]">DELETE RECORD</div>
            <h2 className="mt-[7px] font-display text-[22px] font-bold tracking-[-0.8px]" id="delete-customer-title">Confirm deletion</h2>
          </div>
          <button className="border-0 bg-transparent p-1 text-[#7c867e] hover:text-[#18241e]" aria-label="Close delete confirmation" disabled={busy} onClick={onCancel}><Icon name="close" /></button>
        </div>
        <p className="text-[12px] leading-[1.7] text-[#657168]">
          Delete <strong className="font-semibold text-[#354239]">{label}</strong> from your records? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-10 px-3.5 text-[10px]" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button type="button" className="min-h-10 bg-[#a24238] px-3.5 text-[10px] text-white hover:bg-[#87352d]" disabled={busy} onClick={onConfirm}>
            {busy ? "Deleting…" : "Delete record"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function CustomerForm({ customer, onSave, onClose }) {
  const [form, setForm] = useState(customer);
  const [error, setError] = useState("");
  const editingExisting = Boolean(customer.id);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!form.certificateNumber?.trim() || !form.chassisNo?.trim() || !form.importerName?.trim()) {
      setError("Please add certificate number, chassis no, and importer name.");
      return;
    }
    onSave(form);
  }

  const fieldClass = "mb-[15px] h-[42px] w-full rounded border border-[#dce1d9] bg-white px-[13px] text-[11px] text-ink outline-none transition-[border,box-shadow] duration-200 placeholder:text-[#a6ada7] focus:border-[#86b84e] focus:shadow-[0_0_0_3px_#a7da6c29]";
  const labelClass = "mb-[7px] block text-[11px] font-bold text-[#323a35]";

  return (
    <div className="fixed inset-0 z-20 grid animate-fade-in place-items-center bg-[#101c19a8] p-5 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[min(92vh,760px)] w-full max-w-[560px] overflow-y-auto bg-[#fbfcf9] px-[25px] py-[23px] shadow-[0_20px_70px_#0004] max-[760px]:px-[18px] max-[760px]:py-5" role="dialog" aria-modal="true" aria-labelledby="customer-modal-title">
        <div className="mb-[22px] flex items-start justify-between">
          <div>
            <div className="font-mono text-[8px] tracking-wide text-[#829087]">{editingExisting ? "VEHICLE RECORD" : "NEW RECORD"}</div>
            <h2 className="mt-[7px] font-display text-[22px] font-bold tracking-[-0.8px]" id="customer-modal-title">{editingExisting ? "Edit record" : "Add a record"}</h2>
          </div>
          <button className="border-0 bg-transparent p-1 text-[#7c867e] hover:text-[#18241e]" aria-label="Close form" onClick={onClose}><Icon name="close" /></button>
        </div>
        <form onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1 max-[760px]:gap-0">
            <div className="min-w-0">
              <label className={labelClass} htmlFor="certificate-number">Certificate Number <span className="text-[#8db856]">*</span></label>
              <input className={fieldClass} id="certificate-number" autoFocus value={form.certificateNumber} onChange={(event) => update("certificateNumber", event.target.value)} placeholder="CERT-2026-1001" required />
            </div>
            <div className="min-w-0">
              <label className={labelClass} htmlFor="record-date">Date</label>
              <input className={fieldClass} id="record-date" type="date" value={form.date || ""} onChange={(event) => update("date", event.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1 max-[760px]:gap-0">
            <div className="min-w-0">
              <label className={labelClass} htmlFor="make-body-type">Make / Body Type</label>
              <input className={fieldClass} id="make-body-type" value={form.makeBodyType} onChange={(event) => update("makeBodyType", event.target.value)} placeholder="Toyota / Sedan" />
            </div>
            <div className="min-w-0">
              <label className={labelClass} htmlFor="model">Model</label>
              <input className={fieldClass} id="model" value={form.model} onChange={(event) => update("model", event.target.value)} placeholder="Camry" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1 max-[760px]:gap-0">
            <div className="min-w-0">
              <label className={labelClass} htmlFor="importer-name">Importer Name <span className="text-[#8db856]">*</span></label>
              <input className={fieldClass} id="importer-name" value={form.importerName} onChange={(event) => update("importerName", event.target.value)} placeholder="Pacific Motors Ltd" required />
            </div>
            <div className="min-w-0">
              <label className={labelClass} htmlFor="declaration-number">Declaration Number</label>
              <input className={fieldClass} id="declaration-number" value={form.declarationNumber} onChange={(event) => update("declarationNumber", event.target.value)} placeholder="DEC-88921" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1 max-[760px]:gap-0">
            <div className="min-w-0">
              <label className={labelClass} htmlFor="country">Country</label>
              <input className={fieldClass} id="country" value={form.country} onChange={(event) => update("country", event.target.value)} placeholder="Japan" />
            </div>
            <div className="min-w-0">
              <label className={labelClass} htmlFor="color">Color</label>
              <input className={fieldClass} id="color" value={form.color} onChange={(event) => update("color", event.target.value)} placeholder="Pearl White" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1 max-[760px]:gap-0">
            <div className="min-w-0">
              <label className={labelClass} htmlFor="chassis-no">Chassis No <span className="text-[#8db856]">*</span></label>
              <input className={fieldClass} id="chassis-no" value={form.chassisNo} onChange={(event) => update("chassisNo", event.target.value)} placeholder="JTDBF30E000123456" required />
            </div>
            <div className="min-w-0">
              <label className={labelClass} htmlFor="engine-no">Engine No</label>
              <input className={fieldClass} id="engine-no" value={form.engineNo} onChange={(event) => update("engineNo", event.target.value)} placeholder="2AZ-FE-99821" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1 max-[760px]:gap-0">
            <div className="min-w-0">
              <label className={labelClass} htmlFor="user-id">User ID</label>
              <input className={fieldClass} id="user-id" value={form.userId} onChange={(event) => update("userId", event.target.value)} placeholder="admin@drivebase.com" />
            </div>
            <div className="min-w-0">
              <label className={labelClass} htmlFor="customer-status">Status</label>
              <select className={`${fieldClass} cursor-pointer`} id="customer-status" value={form.status} onChange={(event) => update("status", event.target.value)}>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Cleared</option>
                <option>Hold</option>
              </select>
            </div>
          </div>
          <label className={labelClass} htmlFor="remarks">
            Remarks <span className="float-right font-mono text-[8px] tracking-[0.6px] text-[#a0a8a0]">OPTIONAL</span>
          </label>
          <textarea
            className="mb-2.5 min-h-[76px] w-full resize-y rounded border border-[#dce1d9] bg-white px-3 py-[11px] text-[11px] text-ink outline-none transition-[border,box-shadow] duration-200 placeholder:text-[#a6ada7] focus:border-[#86b84e] focus:shadow-[0_0_0_3px_#a7da6c29]"
            id="remarks"
            rows="3"
            value={form.remarks}
            onChange={(event) => update("remarks", event.target.value)}
            placeholder="Any notes about this vehicle record"
          />
          {error && <p className="border-l-2 border-[#c75f50] bg-[#fff2ef] px-[11px] py-[9px] text-[11px] leading-[1.6] text-[#a24238]" role="alert">{error}</p>}
          <div className="mt-[11px] flex justify-end gap-[9px]">
            <Button type="button" variant="outline" className="min-h-10 px-3.5 text-[10px]" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="min-h-10 px-3.5 text-[10px]">
              <Icon name={editingExisting ? "check" : "plus"} size={16} /> {editingExisting ? "Save changes" : "Add record"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default App;
