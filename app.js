const LS_KEY = "eduboost_ru_functional_v2";

const menuItems = [
  ["landing","🌐","Главная сайта"],
  ["dashboard","🏠","Панель управления"],
  ["register","👤","Регистрация"],
  ["journal","📘","Электронный журнал"],
  ["students","👥","Студенты"],
  ["grades","⭐","Оценки / GPA"],
  ["tasks","📝","Задания"],
  ["docs","📄","Документы"],
  ["finance","💳","Финансы"],
  ["rewards","🎮","Игра / Мотивация"],
  ["modules","▦","Модули"]
];

let state = load();
let page = "landing";
let selectedGroupId = state.selectedGroupId || state.groups[0]?.id;
let search = "";
let sidebarOpen = false;

function load(){
  const saved = localStorage.getItem(LS_KEY);
  if(saved){ try{return JSON.parse(saved)}catch(e){} }
  return {
    groups: JSON.parse(JSON.stringify(window.EDUBOOST_SEED || [])),
    selectedGroupId: (window.EDUBOOST_SEED || [])[0]?.id,
    users: [],
    tasks: [
      {id:id(), title:"Ознакомление с платформой EduBoost", group:"Все группы", deadline:"08.10.2026", status:"Активно"},
      {id:id(), title:"Работа с личным кабинетом", group:"АСУо(9кл)-1-24", deadline:"15.10.2026", status:"Активно"}
    ],
    documents: [
      {id:id(), student:"Айбеков Азамат", type:"Справка об обучении", status:"Готово"},
      {id:id(), student:"Абдирашова Анара Советбековна", type:"Выписка оценок", status:"В обработке"}
    ],
    payments: [
      {id:id(), student:"Айбеков Азамат", amount:12450, purpose:"Оплата обучения", status:"Оплачено"},
      {id:id(), student:"Абдирашова Анара Советбековна", amount:8000, purpose:"Курс", status:"Оплачено"}
    ],
    rewards: [
      {title:"Сертификат", cost:500, stock:20},
      {title:"Книга", cost:800, stock:10},
      {title:"Рюкзак EduBoost", cost:1500, stock:5},
      {title:"Наушники", cost:2500, stock:3}
    ]
  }
}
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function id(){ return Math.random().toString(36).slice(2,10); }
function group(){ return state.groups.find(g=>g.id===selectedGroupId) || state.groups[0]; }
function totalAbs(st){ return (st.attendance||[]).filter(x=>x==="н").length; }
function attendPercent(g){
  const cells = g.students.flatMap(s=>s.attendance||[]).filter(Boolean);
  if(!cells.length) return 0;
  return Math.round(cells.filter(x=>x==="+").length / cells.length * 100);
}
function allStudents(){ return state.groups.flatMap(g=>g.students.map(s=>({group:g, student:s}))); }
function sumAbs(){ return allStudents().reduce((a,x)=>a+totalAbs(x.student),0); }

function layout(content){
  document.getElementById("app").innerHTML = `
    <div class="app">
      <aside class="sidebar ${sidebarOpen?'open':''}" id="sidebar">
        <div class="brand"><span class="brand-icon"><img src="logo-eduboost.svg" alt="EduBoost"></span><span>EduBoost</span></div>
        <div class="user-card"><b>Образовательная платформа</b><span>электронный журнал и управление обучением</span></div>
        <nav class="nav">${menuItems.map(([key,icon,label])=>`<button data-page="${key}" class="${page===key?'active':''}"><i>${icon}</i>${label}</button>`).join("")}</nav>
        <div class="side-line"></div>
        <button class="logout" id="exportCsv">↪ CSV экспорт</button>
      </aside>

      <main class="main">
        <header class="topbar">
          <button class="menu-btn" id="menuBtn">☰</button>
          <div class="search"><span>⌕</span><input id="search" placeholder="Поиск по ФИО, группе, модулю..." value="${esc(search)}"></div>
          <div class="profile"><div class="avatar">👨‍🏫</div><strong>EduBoost Admin</strong></div>
        </header>
        <div class="content">${content}</div>
      </main>
    </div>
  `;
  bind();
}
function bind(){
  document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{page=b.dataset.page; sidebarOpen=false; render();});
  document.getElementById("menuBtn").onclick=()=>{sidebarOpen=!sidebarOpen; render();};
  document.getElementById("search").oninput=e=>{search=e.target.value; render();};
  document.getElementById("exportCsv").onclick=exportCsv;
}
function stat(icon,label,value,hint){return `<div class="stat"><span>${icon}</span><small>${label}</small><b>${value}</b><p>${hint}</p></div>`}

function gameStudentKey(student){ return student.id || student.name; }

function ensureGameData(){
  state.pointRules ||= [
    {id:"attendance", title:"Посещение занятия", points:10, icon:"✅"},
    {id:"task", title:"Выполнение задания", points:20, icon:"📝"},
    {id:"goodGrade", title:"Хорошая оценка", points:30, icon:"⭐"},
    {id:"weekNoAbsence", title:"Неделя без пропусков", points:50, icon:"🔥"},
    {id:"event", title:"Участие в мероприятии", points:40, icon:"🎤"}
  ];

  state.rewards ||= [
    {title:"Сертификат", cost:500, stock:20},
    {title:"Книга", cost:800, stock:10},
    {title:"Рюкзак EduBoost", cost:1500, stock:5},
    {title:"Наушники", cost:2500, stock:3}
  ];

  state.missions ||= [
    {id:"m1", title:"Не пропусти 5 занятий", desc:"Получай посещаемость + за каждое занятие", reward:50, target:5, type:"attendance"},
    {id:"m2", title:"Выполни 3 задания", desc:"Закрой три учебные задачи недели", reward:60, target:3, type:"tasks"},
    {id:"m3", title:"Получи 2 хорошие оценки", desc:"Подними средний результат по предметам", reward:70, target:2, type:"grades"},
    {id:"m4", title:"Будь активным на занятиях", desc:"Участвуй в обсуждении и мероприятиях", reward:40, target:1, type:"activity"}
  ];

  state.manualPoints ||= {};
  state.purchases ||= [];
  state.completedMissions ||= {};
}

function calculateAutoPoints(student){
  ensureGameData();
  const attendancePlus = (student.attendance || []).filter(x => x === "+").length;
  const absences = (student.attendance || []).filter(x => x === "н").length;
  const grades = student.grades || {};
  const gradeValues = [grades.current, grades.mid, grades.exam].map(Number).filter(v => !isNaN(v) && v > 0);
  const goodGrades = gradeValues.filter(v => v >= 80).length;
  const noAbsBonus = absences === 0 && attendancePlus > 0 ? state.pointRules.find(r=>r.id==="weekNoAbsence").points : 0;

  const pAttendance = attendancePlus * state.pointRules.find(r=>r.id==="attendance").points;
  const pGrades = goodGrades * state.pointRules.find(r=>r.id==="goodGrade").points;

  return {
    attendancePlus,
    absences,
    goodGrades,
    pAttendance,
    pGrades,
    noAbsBonus,
    total: pAttendance + pGrades + noAbsBonus
  };
}

function spentPoints(student){
  return (state.purchases || [])
    .filter(p => p.studentId === gameStudentKey(student))
    .reduce((sum, p) => sum + Number(p.cost || 0), 0);
}

function manualPoints(student){
  ensureGameData();
  return Number(state.manualPoints[gameStudentKey(student)] || 0);
}

function totalGamePoints(student){
  return calculateAutoPoints(student).total + manualPoints(student) - spentPoints(student);
}

function levelInfo(points){
  if(points >= 3001) return {name:"EduBoost Leader", icon:"👑", min:3001, next:5000, color:"leader"};
  if(points >= 1501) return {name:"Smart Student", icon:"💎", min:1501, next:3001, color:"smart"};
  if(points >= 501) return {name:"Active Student", icon:"⚡", min:501, next:1501, color:"active"};
  return {name:"Beginner", icon:"🌱", min:0, next:501, color:"beginner"};
}

function levelProgress(points){
  const lvl = levelInfo(points);
  const base = lvl.min;
  const next = lvl.next;
  return Math.max(4, Math.min(100, Math.round(((points - base) / (next - base)) * 100)));
}

function getAchievements(student){
  const calc = calculateAutoPoints(student);
  const points = totalGamePoints(student);
  const list = [];

  if(calc.absences === 0 && calc.attendancePlus > 0) list.push({icon:"🔥", title:"Без пропусков", desc:"Нет н/б за период"});
  if(calc.attendancePlus >= 5) list.push({icon:"✅", title:"Ответственный", desc:"5+ посещений"});
  if(calc.goodGrades >= 2) list.push({icon:"⭐", title:"Отличник", desc:"2+ хороших оценки"});
  if(points >= 500) list.push({icon:"⚡", title:"Активный студент", desc:"500+ баллов"});
  if(points >= 1500) list.push({icon:"💎", title:"Smart Student", desc:"1500+ баллов"});
  if(points >= 3000) list.push({icon:"👑", title:"Лидер EduBoost", desc:"3000+ баллов"});
  if(list.length === 0) list.push({icon:"🌱", title:"Первые шаги", desc:"Начало пути в EduBoost"});

  return list;
}

function leaderboard(){
  return allStudents()
    .map(x => ({...x, points: totalGamePoints(x.student), level: levelInfo(totalGamePoints(x.student))}))
    .sort((a,b) => b.points - a.points);
}

function selectedGameStudent(){
  const g = group();
  return g.students[0] || allStudents()[0]?.student;
}

function getMissionProgress(student, mission){
  const calc = calculateAutoPoints(student);
  if(mission.type === "attendance") return Math.min(mission.target, calc.attendancePlus);
  if(mission.type === "grades") return Math.min(mission.target, calc.goodGrades);
  if(mission.type === "tasks") return Math.min(mission.target, Math.min(state.tasks?.length || 0, mission.target));
  if(mission.type === "activity") return Math.min(mission.target, calc.attendancePlus > 0 ? 1 : 0);
  return 0;
}

function completeMission(studentId, missionId){
  ensureGameData();
  const key = `${studentId}:${missionId}`;
  if(state.completedMissions[key]) return;
  const mission = state.missions.find(m => m.id === missionId);
  if(!mission) return;
  state.completedMissions[key] = true;
  state.manualPoints[studentId] = Number(state.manualPoints[studentId] || 0) + Number(mission.reward || 0);
  save();
  toast("Миссия выполнена! +" + mission.reward + " баллов");
  render();
}

function addManualPointsToStudent(studentId, points, reason){
  ensureGameData();
  state.manualPoints[studentId] = Number(state.manualPoints[studentId] || 0) + Number(points || 0);
  state.pointHistory ||= [];
  state.pointHistory.push({studentId, points:Number(points||0), reason: reason || "Ручное начисление", date:new Date().toLocaleString("ru-RU")});
  save();
  toast("Баллы начислены");
  render();
}

function redeemReward(studentId, rewardIndex){
  ensureGameData();
  const stWrap = allStudents().find(x => gameStudentKey(x.student) === studentId);
  if(!stWrap) return;
  const reward = state.rewards[rewardIndex];
  if(!reward) return;
  if(Number(reward.stock || 0) <= 0){
    toast("Подарок закончился");
    return;
  }
  const points = totalGamePoints(stWrap.student);
  if(points < reward.cost){
    toast("Недостаточно баллов");
    return;
  }
  reward.stock = Number(reward.stock || 0) - 1;
  state.purchases.push({
    id: id(),
    studentId,
    student: stWrap.student.name,
    reward: reward.title,
    cost: reward.cost,
    date: new Date().toLocaleDateString("ru-RU")
  });
  save();
  toast("Подарок обменян");
  render();
}

function gameStat(icon,label,value,hint){
  return `<div class="game-stat"><span>${icon}</span><small>${label}</small><b>${value}</b><p>${hint}</p></div>`;
}

function render(){
  const map = {landing,dashboard,register,journal,students,grades,tasks,docs,finance,rewards,modules};
  return map[page]();
}

function landing(){
  const g = group();
  const topStudents = leaderboard ? leaderboard().slice(0,3) : [];
  layout(`
    <section class="site-hero">
      <div class="site-hero-content">
        <div class="site-kicker">ОБРАЗОВАТЕЛЬНАЯ ПЛАТФОРМА • ЭЛЕКТРОННЫЙ ЖУРНАЛ • МОТИВАЦИЯ</div>
        <h1>EduBoost — современная система для обучения, контроля и мотивации студентов</h1>
        <p>
          Платформа объединяет электронный журнал, посещаемость, оценки, задания,
          документы, финансы и игровую систему баллов в одном удобном интерфейсе.
        </p>
        <div class="site-cta">
          <button class="primary" data-go="dashboard">Открыть платформу →</button>
          <button class="ghost" data-go="journal">Посмотреть журнал</button>
          <button class="ghost" data-go="rewards">Игровая система</button>
        </div>
        <div class="site-trust">
          <span>⚡ Работает быстро</span>
          <span>📱 Адаптивный дизайн</span>
          <span>🎮 Геймификация</span>
          <span>📊 Аналитика</span>
        </div>
      </div>

      <div class="site-hero-visual">
        <div class="site-dashboard-card">
          <div class="fake-browser">
            <i></i><i></i><i></i>
          </div>
          <div class="fake-content">
            <div class="fake-sidebar"></div>
            <div class="fake-main">
              <div class="fake-top"></div>
              <div class="fake-stats">
                <span></span><span></span><span></span>
              </div>
              <div class="fake-chart"></div>
              <div class="fake-list">
                <p></p><p></p><p></p>
              </div>
            </div>
          </div>
        </div>
        <div class="floating-info info-one"><b>${allStudents().length}</b><span>студентов</span></div>
        <div class="floating-info info-two"><b>${state.groups.length}</b><span>групп</span></div>
        <div class="floating-info info-three"><b>${attendPercent(g)}%</b><span>посещаемость</span></div>
      </div>
    </section>

    <section class="site-section">
      <div class="section-head">
        <span>ВОЗМОЖНОСТИ</span>
        <h2>Всё, что нужно учебному заведению</h2>
        <p>EduBoost можно использовать как цифровой журнал, кабинет преподавателя, кабинет студента и систему мотивации.</p>
      </div>

      <div class="site-feature-grid">
        <article><span>📘</span><h3>Электронный журнал</h3><p>Отметки + / н, автоматический подсчёт н/б, поиск по ФИО и экспорт.</p></article>
        <article><span>⭐</span><h3>Оценки и GPA</h3><p>Текущие, рубежные, экзамен, итоговая оценка и анализ успеваемости.</p></article>
        <article><span>📝</span><h3>Задания</h3><p>Домашние задания, сроки сдачи, статус выполнения и контроль активности.</p></article>
        <article><span>📄</span><h3>Документы</h3><p>Справки, выписки, транскрипты и заявки студентов в цифровом виде.</p></article>
        <article><span>💳</span><h3>Финансы</h3><p>История оплат, задолженности, суммы и финансовые отчёты.</p></article>
        <article><span>🎮</span><h3>Игра / Мотивация</h3><p>Баллы, уровни, достижения, рейтинг, миссии и магазин подарков.</p></article>
      </div>
    </section>

    <section class="site-section split">
      <div>
        <span class="site-kicker blue">ГЕЙМИФИКАЦИЯ</span>
        <h2>Студент не просто учится — он развивается как в игре</h2>
        <p>
          За посещаемость, хорошие оценки, задания и активность студент получает баллы.
          Баллы открывают уровни, достижения и возможность обмена на подарки.
        </p>
        <div class="game-rules">
          <div><b>+10</b><span>посещение</span></div>
          <div><b>+20</b><span>задание</span></div>
          <div><b>+30</b><span>хорошая оценка</span></div>
          <div><b>+50</b><span>неделя без н/б</span></div>
        </div>
        <button class="primary" data-go="rewards">Открыть игру</button>
      </div>

      <div class="leader-preview">
        <h3>Рейтинг студентов</h3>
        ${(topStudents.length ? topStudents : allStudents().slice(0,3).map(x=>({...x, points: totalGamePoints ? totalGamePoints(x.student) : 0, level:{icon:"🌱",name:"Beginner"}}))).map((x,i)=>`
          <div class="leader-row">
            <b>${i+1}</b>
            <span>${x.level?.icon || "🌱"}</span>
            <div><strong>${x.student.name}</strong><small>${x.group.name}</small></div>
            <em>${x.points || 0}</em>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="site-section">
      <div class="section-head">
        <span>РОЛИ</span>
        <h2>Отдельный подход для каждого пользователя</h2>
      </div>

      <div class="role-grid">
        <article><span>🎓</span><h3>Студент</h3><p>Видит расписание, оценки, н/б, задания, документы, баллы и достижения.</p></article>
        <article><span>👨‍🏫</span><h3>Преподаватель</h3><p>Ведёт журнал, отмечает посещаемость, выставляет оценки и выдаёт задания.</p></article>
        <article><span>🏛</span><h3>Администрация</h3><p>Контролирует группы, отчёты, активность, документы и общую аналитику.</p></article>
      </div>
    </section>

    <section class="site-section final-cta">
      <h2>Готово к демонстрации проекта</h2>
      <p>Откройте платформу и проверьте электронный журнал, студентов, оценки, документы, финансы и игру.</p>
      <button class="primary" data-go="dashboard">Перейти в платформу →</button>
    </section>
  `);

  document.querySelectorAll("[data-go]").forEach(btn => {
    btn.onclick = () => {
      page = btn.dataset.go;
      render();
    };
  });
}

function dashboard(){
  const g=group();
  const risk=allStudents().filter(x=>totalAbs(x.student)>=3).slice(0,6);
  layout(`
    <section class="hero">
      <div class="hero-dark">
        <div class="hero-label">УЧИСЬ • РАСТИ • ДОСТИГАЙ</div>
        <h1>Modern<br><span>Education</span><br>Platform</h1>
        <p>EduBoost помогает студентам, преподавателям и администрации управлять обучением в одной современной системе.</p>
        <div class="hero-features">
          <div><span>▥</span><b>Прогресс</b><p>результаты в реальном времени</p></div>
          <div><span>📅</span><b>Расписание</b><p>занятия и уведомления</p></div>
          <div><span>⚡</span><b>Мотивация</b><p>баллы и достижения</p></div>
        </div>
        <div class="device">
          <div class="device-side"><span></span><span></span><span></span><span></span></div>
          <div class="device-main"><h3>Доброе утро!</h3><div class="mini-cards"><div><small>Курсы</small><b>6</b></div><div><small>Выполнено</small><b>12</b></div><div><small>Средний</small><b>4.6</b></div></div><div class="mini-chart"></div></div>
        </div>
      </div>
      <div class="register-card">
        <h2>Создать аккаунт</h2>
        <p>Регистрация студента, преподавателя или администратора.</p>
        ${registerForm()}
      </div>
    </section>

    <div class="stats">
      ${stat("👥","Студентов",allStudents().length,"по всем группам")}
      ${stat("📚","Групп",state.groups.length,"АСУо 9-класс")}
      ${stat("✅","Посещаемость",attendPercent(g)+"%",g.name)}
      ${stat("🚫","Всего н/б",sumAbs(),"по журналу")}
    </div>

    <section class="panel">
      <div class="panel-head"><h2>Группы</h2><button class="ghost" id="toJournal">Открыть журнал</button></div>
      <div class="group-grid">${state.groups.map(groupCard).join("")}</div>
    </section>

    <div class="grid two">
      <section class="panel"><div class="panel-head"><h2>Студенты с большим количеством н/б</h2></div><div class="cards">${risk.map(x=>studentCard(x.student,x.group)).join("") || `<p>Критических пропусков нет.</p>`}</div></section>
      <section class="panel"><div class="panel-head"><h2>Преимущества системы</h2></div><div class="module-grid">${featureCards().join("")}</div></section>
    </div>
  `);
  afterRegister();
  document.getElementById("toJournal").onclick=()=>{page="journal";render()};
  document.querySelectorAll("[data-group]").forEach(el=>el.onclick=()=>{selectedGroupId=el.dataset.group;state.selectedGroupId=selectedGroupId;save();page="journal";render();});
}
function register(){
  layout(`<div class="page-head"><div><h1>Регистрация</h1><p>Форма сохраняет пользователей в браузере.</p></div></div><div class="grid two"><section class="register-card"><h2>Создать аккаунт</h2>${registerForm()}</section><section class="panel"><h2>Зарегистрированные</h2><div class="cards">${state.users.map(u=>`<div class="student-card"><b>${u.name}</b><small>${u.email}</small><br><span class="badge green">${u.role}</span><span class="badge orange">${u.group}</span></div>`).join("") || "<p>Пока нет пользователей.</p>"}</div></section></div>`);
  afterRegister();
}
function registerForm(){
  return `<form class="register-form" id="registerForm">
    <label class="field"><span>👤</span><input name="name" placeholder="ФИО" required></label>
    <label class="field"><span>✉</span><input name="email" type="email" placeholder="Email" required></label>
    <label class="field"><span>🔒</span><input name="password" type="password" placeholder="Пароль" minlength="6" required></label>
    <label class="field"><span>👥</span><select name="role" required><option value="">Выберите роль</option><option>Студент</option><option>Преподаватель</option><option>Администратор</option><option>Родитель</option></select></label>
    <label class="field"><span>🏛</span><select name="group" required><option value="">Учреждение / группа</option>${state.groups.map(g=>`<option>${g.name}</option>`).join("")}</select></label>
    <button class="primary">Создать аккаунт →</button>
  </form>`;
}
function afterRegister(){
  document.getElementById("registerForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.target).entries());
    state.users.push({id:id(),...data,date:new Date().toLocaleDateString("ru-RU")});
    save(); toast("Аккаунт сохранён"); e.target.reset();
  });
}
function groupCard(g){
  const p=attendPercent(g);
  return `<button class="group-card ${g.id===selectedGroupId?'active':''}" data-group="${g.id}"><h3>${g.name}</h3><p>${g.students.length} студентов • ${g.dates.length} занятий</p><div class="progress"><i style="width:${p}%"></i></div><p><b>${p}%</b> посещаемость</p></button>`;
}
function featureCards(){
  return [
    ["📘","Электронный журнал","Посещаемость, н/б, даты занятий"],
    ["⭐","Оценки / GPA","Ведомость и итоговые оценки"],
    ["📄","Документы","Справки, транскрипты, выписки"],
    ["🏆","Мотивация","Баллы, подарки и рейтинг"]
  ].map(x=>`<article class="module-card"><span>${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p></article>`);
}
function journal(){
  const g=group(); const list=filter(g.students);
  layout(`
    <div class="page-head"><div><h1>Электронный журнал</h1><p>${g.name} • сентябрь • отметки посещаемости</p></div><select class="select" id="groupSelect">${state.groups.map(x=>`<option value="${x.id}" ${x.id===selectedGroupId?'selected':''}>${x.name}</option>`).join("")}</select></div>
    <div class="stats">${stat("👥","Студентов",g.students.length,"в группе")}${stat("📅","Занятий",g.dates.length,"сентябрь")}${stat("✅","Посещаемость",attendPercent(g)+"%","по группе")}${stat("🚫","Н/Б",g.students.reduce((a,s)=>a+totalAbs(s),0),"по группе")}</div>
    <section class="panel">
      <div class="toolbar"><button class="primary" id="addStudent">+ Студент</button><button class="ghost" id="addDate">+ Дата занятия</button><button class="ghost" onclick="window.print()">Печать</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>№ / ФИО</th>${g.dates.map((d,i)=>`<th>${d.date}<br><small>${d.time} ${d.type}</small><br><button class="status empty" data-remove-date="${i}">×</button></th>`).join("")}<th>Всего н/б</th></tr></thead><tbody>${list.map(st=>`<tr><td><span class="no">${st.no}</span>${mark(st.name)}</td>${g.dates.map((d,i)=>cell(st,i)).join("")}<td>${badge(totalAbs(st))}</td></tr>`).join("")}</tbody></table></div>
    </section>
  `);
  document.getElementById("groupSelect").onchange=e=>{selectedGroupId=e.target.value;state.selectedGroupId=selectedGroupId;save();render()};
  document.querySelectorAll("[data-st][data-col]").forEach(b=>b.onclick=()=>toggle(b.dataset.st,+b.dataset.col));
  document.querySelectorAll("[data-remove-date]").forEach(b=>b.onclick=()=>removeDate(+b.dataset.removeDate));
  document.getElementById("addStudent").onclick=studentModal;
  document.getElementById("addDate").onclick=dateModal;
}
function cell(st,i){const v=st.attendance[i]||"";return `<td><button class="status ${v==='+'?'plus':v==='н'?'abs':'empty'}" data-st="${st.id}" data-col="${i}">${v||"—"}</button></td>`}
function badge(t){return `<span class="badge ${t>=4?'red':t>=2?'orange':'green'}">${t}</span>`}
function toggle(stId,col){const st=allStudents().find(x=>x.student.id===stId).student;const v=st.attendance[col]||"";st.attendance[col]=v===""?"+":v==="+"?"н":"";save();render();}
function removeDate(i){if(!confirm("Удалить дату занятия?"))return;const g=group();g.dates.splice(i,1);g.students.forEach(s=>s.attendance.splice(i,1));save();render();}
function filter(students){const q=search.toLowerCase().trim();return q?students.filter(s=>s.name.toLowerCase().includes(q)):students}
function students(){
  const list=allStudents().filter(x=>!search || x.student.name.toLowerCase().includes(search.toLowerCase()) || x.group.name.toLowerCase().includes(search.toLowerCase()));
  layout(`<div class="page-head"><div><h1>Студенты</h1><p>База студентов по всем группам.</p></div></div><div class="cards">${list.map(x=>studentCard(x.student,x.group)).join("")}</div>`);
}
function studentCard(st,g){const t=totalAbs(st);return `<div class="student-card"><b>${mark(st.name)}</b><small>${g.name}</small><br><span class="badge ${t>=4?'red':t>=2?'orange':'green'}">${t} н/б</span></div>`}
function grades(){
  const list=allStudents().filter(x=>!search || x.student.name.toLowerCase().includes(search.toLowerCase()));
  layout(`<div class="page-head"><div><h1>Оценки / GPA</h1><p>Демо-ведомость с автоматическим итогом.</p></div></div><section class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>ФИО</th><th>Группа</th><th>Текущий</th><th>Рубеж</th><th>Экзамен</th><th>Итог</th></tr></thead><tbody>${list.map(x=>gradeRow(x)).join("")}</tbody></table></div></section>`);
  document.querySelectorAll(".grade").forEach(inp=>inp.oninput=()=>{const st=allStudents().find(x=>x.student.id===inp.dataset.st).student;st.grades ||= {current:0,mid:0,exam:0};st.grades[inp.dataset.k]=+inp.value;save();});
}
function gradeRow(x){const st=x.student;st.grades ||= {current:0,mid:0,exam:0};const g=st.grades;const fin=Math.round(((+g.current||0)+(+g.mid||0)+(+g.exam||0))/3);return `<tr><td>${mark(st.name)}</td><td>${x.group.name}</td>${["current","mid","exam"].map(k=>`<td><input class="input grade" data-st="${st.id}" data-k="${k}" type="number" value="${g[k]||0}" style="width:80px;padding:0 8px"></td>`).join("")}<td>${fin}</td></tr>`}
function tasks(){ layout(`<div class="page-head"><div><h1>Задания</h1><p>Домашние задания и сроки сдачи.</p></div></div><section class="panel"><div class="toolbar"><button class="primary" id="newTask">+ Задание</button></div><div class="cards">${state.tasks.map(t=>`<div class="student-card"><h3>${t.title}</h3><p>${t.group}</p><span class="badge green">${t.deadline}</span><span class="badge orange">${t.status}</span></div>`).join("")}</div></section>`);document.getElementById("newTask").onclick=taskModal;}
function docs(){ layout(`<div class="page-head"><div><h1>Документы</h1><p>Справки, транскрипты и выписки.</p></div></div><section class="panel"><div class="toolbar"><button class="primary" id="newDoc">+ Заявка</button></div><div class="cards">${state.documents.map(d=>`<div class="student-card"><h3>${d.type}</h3><p>${d.student}</p><span class="badge ${d.status==='Готово'?'green':'orange'}">${d.status}</span></div>`).join("")}</div></section>`);document.getElementById("newDoc").onclick=docModal;}
function finance(){const sum=state.payments.reduce((a,p)=>a+(+p.amount||0),0);layout(`<div class="page-head"><div><h1>Финансы</h1><p>Оплаты, задолженности и квитанции.</p></div></div><div class="stats">${stat("💳","Сумма оплат",sum+" сом","общая")}${stat("🧾","Платежей",state.payments.length,"записей")}${stat("✅","Статус","Активно","модуль")}${stat("📊","Отчет","CSV","доступен")}</div><section class="panel"><div class="toolbar"><button class="primary" id="newPay">+ Платеж</button></div><div class="cards">${state.payments.map(p=>`<div class="student-card"><h3>${p.amount} сом</h3><p>${p.student}</p><span class="badge green">${p.purpose}</span><span class="badge orange">${p.status}</span></div>`).join("")}</div></section>`);document.getElementById("newPay").onclick=payModal;}
function rewards(){layout(`<div class="page-head"><div><h1>Мотивация</h1><p>Баллы, достижения и подарки.</p></div></div><div class="stats">${stat("🏆","Баллы","12 500","демо-фонд")}${stat("🎁","Сыйлыктар",state.rewards.length,"каталог")}${stat("✅","0 н/б",allStudents().filter(x=>totalAbs(x.student)===0).length,"студентов")}${stat("🔥","3+ н/б",allStudents().filter(x=>totalAbs(x.student)>=3).length,"группа риска")}</div><section class="panel"><div class="cards">${state.rewards.map(r=>`<div class="student-card"><h3>${r.title}</h3><p>${r.cost} баллов</p><span class="badge green">Склад: ${r.stock}</span></div>`).join("")}</div></section>`)}
function modules(){layout(`<div class="page-head"><div><h1>Модули платформы</h1><p>Основные возможности EduBoost.</p></div></div><div class="module-grid">${[
["📘","Электронный журнал","Посещаемость, причины пропусков, статистика."],
["⭐","Электронная ведомость","Текущие, рубежные, экзамен и итоговая оценка."],
["📅","Расписание","Создание расписания, кабинеты, изменения."],
["📝","Домашние задания","Загрузка материалов, сроки сдачи, проверка."],
["📄","Документооборот","Справки, транскрипт, академическая справка."],
["💳","Финансовый модуль","Оплата обучения, история платежей, задолженности."],
["🏆","Геймификация","Баллы, достижения, рейтинги и подарки."],
["🔔","Уведомления","Push, email, SMS и Telegram."],
["🛡","Безопасность","Роли, доступы, журнал действий."]
].map(x=>`<article class="module-card"><span>${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join("")}</div>`)}
function studentModal(){modal("Добавить студента",`<div class="form-grid"><input class="input" id="fio" placeholder="ФИО"><select class="input" id="gpick">${state.groups.map(g=>`<option value="${g.id}" ${g.id===selectedGroupId?'selected':''}>${g.name}</option>`).join("")}</select></div>`,()=>{const g=state.groups.find(x=>x.id===document.getElementById("gpick").value);const name=document.getElementById("fio").value.trim();if(!name)return;g.students.push({id:g.id+"-"+id(),no:g.students.length+1,name,attendance:g.dates.map(()=>""),total:0});save();render();})}
function dateModal(){modal("Добавить дату",`<div class="form-grid"><input class="input" id="date" placeholder="дд-мм-гг"><input class="input" id="time" placeholder="09:30"><select class="input" id="type"><option>Лк.</option><option>Пр.</option></select></div>`,()=>{const g=group();g.dates.push({date:document.getElementById("date").value||"01-10-26",time:document.getElementById("time").value||"09:30",type:document.getElementById("type").value});g.students.forEach(s=>s.attendance.push(""));save();render();})}
function taskModal(){modal("Добавить задание",`<input class="input" id="title" placeholder="Название задания"><br><br><div class="form-grid"><select class="input" id="groupName"><option>Все группы</option>${state.groups.map(g=>`<option>${g.name}</option>`).join("")}</select><input class="input" id="deadline" placeholder="дд.мм.гггг"></div>`,()=>{state.tasks.push({id:id(),title:document.getElementById("title").value||"Новое задание",group:document.getElementById("groupName").value,deadline:document.getElementById("deadline").value||"-",status:"Активно"});save();render();})}
function docModal(){modal("Заявка на документ",`<div class="form-grid"><input class="input" id="student" placeholder="ФИО"><select class="input" id="type"><option>Справка об обучении</option><option>Транскрипт</option><option>Академическая справка</option><option>Выписка оценок</option></select></div>`,()=>{state.documents.push({id:id(),student:document.getElementById("student").value||"Студент",type:document.getElementById("type").value,status:"В обработке"});save();render();})}
function payModal(){modal("Добавить платеж",`<div class="form-grid"><input class="input" id="student" placeholder="ФИО"><input class="input" id="amount" type="number" placeholder="Сумма"></div><br><input class="input" id="purpose" placeholder="Назначение">`,()=>{state.payments.push({id:id(),student:document.getElementById("student").value||"Студент",amount:+document.getElementById("amount").value||0,purpose:document.getElementById("purpose").value||"Оплата",status:"Оплачено"});save();render();})}
function modal(title,body,onSave){const m=document.getElementById("modal");m.classList.add("open");m.innerHTML=`<div class="modal-box"><button class="modal-close" id="close">×</button><h2>${title}</h2>${body}<br><br><button class="primary" id="save">Сохранить</button></div>`;document.getElementById("close").onclick=()=>m.classList.remove("open");document.getElementById("save").onclick=()=>{onSave();m.classList.remove("open");toast("Сохранено")};}
function exportCsv(){const g=group();const rows=[["№","ФИО",...g.dates.map(d=>`${d.date} ${d.time} ${d.type}`),"Всего н/б"]];g.students.forEach(s=>rows.push([s.no,s.name,...s.attendance,totalAbs(s)]));download(`EduBoost_${g.name}.csv`,rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(";")).join("\n"));}
function download(name,content){const blob=new Blob([content],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function mark(text){if(!search.trim())return esc(text);return esc(text).replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"ig"),m=>`<mark>${m}</mark>`)}
render();

function rewards(){
  ensureGameData();
  const board = leaderboard();
  const activeStudent = selectedGameStudent();
  const activeKey = gameStudentKey(activeStudent);
  const total = totalGamePoints(activeStudent);
  const lvl = levelInfo(total);
  const progress = levelProgress(total);
  const calc = calculateAutoPoints(activeStudent);
  const ach = getAchievements(activeStudent);

  layout(`
    <div class="page-head">
      <div>
        <h1>Игра / Мотивация</h1>
        <p>Баллы, уровни, достижения, рейтинг, магазин подарков и еженедельные миссии.</p>
      </div>
      <select class="select" id="gameStudentSelect">
        ${allStudents().map(x=>`<option value="${gameStudentKey(x.student)}" ${gameStudentKey(x.student)===activeKey?'selected':''}>${x.student.name} — ${x.group.name}</option>`).join("")}
      </select>
    </div>

    <section class="game-hero">
      <div class="game-profile-card">
        <div class="game-avatar">${lvl.icon}</div>
        <div>
          <span class="game-label">Текущий студент</span>
          <h2>${activeStudent.name}</h2>
          <p>${group().name || "Группа"} • ${lvl.name}</p>
        </div>
      </div>

      <div class="game-score">
        <span>Баллы</span>
        <strong>${total}</strong>
        <p>Авто: ${calc.total} • Доп.: ${manualPoints(activeStudent)} • Потрачено: ${spentPoints(activeStudent)}</p>
        <div class="game-progress"><i style="width:${progress}%"></i></div>
        <small>Прогресс уровня: ${progress}%</small>
      </div>

      <div class="quick-points">
        <button class="primary" data-add-points="${activeKey}" data-points="10">+10 посещение</button>
        <button class="primary" data-add-points="${activeKey}" data-points="20">+20 задание</button>
        <button class="primary" data-add-points="${activeKey}" data-points="30">+30 оценка</button>
      </div>
    </section>

    <div class="game-stats-grid">
      ${gameStat("✅","Посещений",calc.attendancePlus,"+10 за каждое занятие")}
      ${gameStat("🚫","Пропусков",calc.absences,"контроль н/б")}
      ${gameStat("⭐","Хороших оценок",calc.goodGrades,"+30 за результат")}
      ${gameStat("🔥","Бонус без н/б",calc.noAbsBonus,"+50 при отсутствии пропусков")}
    </div>

    <div class="grid two">
      <section class="panel">
        <div class="panel-head">
          <h2>Достижения</h2>
          <span class="badge green">${ach.length} открыто</span>
        </div>
        <div class="achievement-grid">
          ${ach.map(a=>`<article class="achievement"><span>${a.icon}</span><b>${a.title}</b><small>${a.desc}</small></article>`).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Рейтинг группы</h2>
          <span class="badge orange">TOP ${Math.min(10, board.length)}</span>
        </div>
        <div class="leaderboard-list">
          ${board.slice(0,10).map((x,i)=>`
            <div class="leader-row ${gameStudentKey(x.student)===activeKey?'me':''}">
              <b>${i+1}</b>
              <span>${x.level.icon}</span>
              <div><strong>${x.student.name}</strong><small>${x.group.name} • ${x.level.name}</small></div>
              <em>${x.points}</em>
            </div>
          `).join("")}
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head">
        <h2>Еженедельные миссии</h2>
        <span class="badge green">миссии дают дополнительные баллы</span>
      </div>
      <div class="mission-grid">
        ${state.missions.map(m=>{
          const doneKey = `${activeKey}:${m.id}`;
          const prog = getMissionProgress(activeStudent,m);
          const percent = Math.round((prog / m.target) * 100);
          const completed = state.completedMissions[doneKey] || prog >= m.target;
          return `<article class="mission">
            <div class="mission-icon">🎯</div>
            <h3>${m.title}</h3>
            <p>${m.desc}</p>
            <div class="game-progress"><i style="width:${Math.min(100,percent)}%"></i></div>
            <small>${prog}/${m.target} • награда +${m.reward} баллов</small>
            <button class="${completed && !state.completedMissions[doneKey] ? 'primary' : 'ghost'}" data-complete-mission="${m.id}" data-student="${activeKey}" ${state.completedMissions[doneKey] ? 'disabled' : ''}>
              ${state.completedMissions[doneKey] ? 'Получено' : completed ? 'Получить награду' : 'В процессе'}
            </button>
          </article>`;
        }).join("")}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>Магазин подарков</h2>
        <span class="badge orange">обмен баллов на награды</span>
      </div>
      <div class="shop-grid">
        ${state.rewards.map((r,i)=>`<article class="shop-card">
          <div class="shop-icon">${i===0?'📜':i===1?'📚':i===2?'🎒':'🎧'}</div>
          <h3>${r.title}</h3>
          <p>${r.cost} баллов</p>
          <small>Остаток: ${r.stock}</small>
          <button class="primary" data-redeem="${i}" data-student="${activeKey}">Обменять</button>
        </article>`).join("")}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>История обмена подарков</h2></div>
      <div class="cards">
        ${(state.purchases || []).slice().reverse().map(p=>`<div class="student-card"><b>${p.reward}</b><small>${p.student}</small><br><span class="badge orange">${p.cost} баллов</span><span class="badge green">${p.date}</span></div>`).join("") || "<p>Пока обменов нет.</p>"}
      </div>
    </section>
  `);

  document.getElementById("gameStudentSelect").onchange = e => {
    const selected = allStudents().find(x=>gameStudentKey(x.student)===e.target.value);
    if(selected){
      selectedGroupId = selected.group.id;
      state.selectedGroupId = selected.group.id;
      const g = selected.group;
      const first = g.students[0];
      if(first && gameStudentKey(first) !== e.target.value){
        const idx = g.students.findIndex(s=>gameStudentKey(s)===e.target.value);
        if(idx > 0){
          const [st] = g.students.splice(idx,1);
          g.students.unshift(st);
          g.students.forEach((s,i)=>s.no=i+1);
        }
      }
      save();
      render();
    }
  };

  document.querySelectorAll("[data-add-points]").forEach(btn=>btn.onclick=()=>{
    addManualPointsToStudent(btn.dataset.addPoints, Number(btn.dataset.points), "Быстрое начисление");
  });

  document.querySelectorAll("[data-redeem]").forEach(btn=>btn.onclick=()=>{
    redeemReward(btn.dataset.student, Number(btn.dataset.redeem));
  });

  document.querySelectorAll("[data-complete-mission]").forEach(btn=>btn.onclick=()=>{
    if(btn.disabled) return;
    completeMission(btn.dataset.student, btn.dataset.completeMission);
  });
}
