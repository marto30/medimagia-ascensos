import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =====================================================================
//  FIREBASE CONFIG
// =====================================================================
const firebaseConfig = {
  apiKey:            "AIzaSyAFeEm4gJv8qcmhWeMnipcmk-Wpwi5I1G4",
  authDomain:        "medimagia-ascensos.firebaseapp.com",
  projectId:         "medimagia-ascensos",
  storageBucket:     "medimagia-ascensos.firebasestorage.app",
  messagingSenderId: "508815684624",
  appId:             "1:508815684624:web:988d28cf27268deedc4695"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// =====================================================================
//  CONSTANTS
// =====================================================================
const DEFAULT_PWD   = "Medimagia2024";   // contraseña por defecto (primera vez)
const ASCENSO_PCT   = 67;
const RANKS_ORDER   = ["Aprendiz","Principiante","Intermedio","Avanzado"];
const RANKS = {
  Aprendiz:     ["Bullapure","Férula","Osseus Reparo","Tergeo"],
  Principiante: ["Examino","Vitae Expulso","Leniter","Sommnium","Anapneo","Anesthetica","Brackium Emendo"],
  Intermedio:   ["Vitalis","Tranquillitas","Melis Sanitas","Tergiverso","Vulnera Curatio","Ennervate","Invenio Cardium"],
  Avanzado:     ["Restitutio Mobilitas","Medimend","Mind Recupero","Solatio","Finite Incantatem","Confractus","Amicientes","Reparifarge","Panacea","Zanarem","Suturae","Revitalizare"]
};

// Datos iniciales — se suben a Firestore solo si la colección está vacía
const BASE_DATA = {"Ymir Aleister":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":true,"Mind Recupero":true,"Solatio":true,"Finite Incantatem":false,"Confractus":true,"Amicientes":false,"Reparifarge":true,"Panacea":true,"Zanarem":true,"Suturae":false,"Revitalizare":false},"Xaden Knight":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":true,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":true,"Confractus":false,"Amicientes":true,"Reparifarge":true,"Panacea":false,"Zanarem":false,"Suturae":true,"Revitalizare":false},"Makelele D. Shacklebolt":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":true,"Mind Recupero":true,"Solatio":true,"Finite Incantatem":true,"Confractus":true,"Amicientes":true,"Reparifarge":true,"Panacea":true,"Zanarem":false,"Suturae":true,"Revitalizare":true},"Filipo Fuentes":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":false,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":false,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":false,"Mind Recupero":true,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Chloe Miller":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":false,"Tergiverso":true,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Adrian Marston":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":true,"Mind Recupero":false,"Solatio":true,"Finite Incantatem":false,"Confractus":true,"Amicientes":false,"Reparifarge":true,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Indigo Travers":{"Bullapure":true,"Férula":false,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":false,"Vitalis":false,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":true,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":true,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Lilith Hill":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":true,"Mind Recupero":true,"Solatio":true,"Finite Incantatem":false,"Confractus":true,"Amicientes":true,"Reparifarge":true,"Panacea":true,"Zanarem":false,"Suturae":true,"Revitalizare":false},"Virgil Macmillan":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":false,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":false,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":false,"Ennervate":true,"Invenio Cardium":false,"Restitutio Mobilitas":true,"Medimend":false,"Mind Recupero":true,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Selina Lestrange":{"Bullapure":false,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":false,"Leniter":false,"Sommnium":true,"Anapneo":false,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":true,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Antonio Matamoros":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":false,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":false,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Arlequin Nott":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":false,"Mind Recupero":false,"Solatio":true,"Finite Incantatem":true,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":true},"Bella DiLaurentis":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":false,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":true,"Medimend":false,"Mind Recupero":false,"Solatio":true,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Gideon Umbrawell":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":false,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Clarent Avery":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":false,"Anesthetica":false,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":false,"Tergiverso":true,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":true,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Paul H. Brown":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":false,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":false,"Tergiverso":true,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":true,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Viktoria Bellamy":{"Bullapure":false,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":false,"Leniter":true,"Sommnium":true,"Anapneo":false,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":false,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Exequiel Delorian":{"Bullapure":true,"Férula":true,"Osseus Reparo":false,"Tergeo":true,"Examino":true,"Vitae Expulso":false,"Leniter":true,"Sommnium":true,"Anapneo":false,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":true,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Bayron Shajad":{"Bullapure":false,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":false,"Leniter":true,"Sommnium":true,"Anapneo":false,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":false,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Nyx Rowengrave":{"Bullapure":false,"Férula":true,"Osseus Reparo":false,"Tergeo":false,"Examino":true,"Vitae Expulso":false,"Leniter":false,"Sommnium":false,"Anapneo":false,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":false,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Margot Reed":{"Bullapure":false,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":false,"Sommnium":true,"Anapneo":false,"Anesthetica":true,"Brackium Emendo":false,"Vitalis":true,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Rebekah Twist":{"Bullapure":false,"Férula":false,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":false,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":false,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Zeta Tokito":{"Bullapure":false,"Férula":false,"Osseus Reparo":false,"Tergeo":false,"Examino":true,"Vitae Expulso":false,"Leniter":true,"Sommnium":false,"Anapneo":false,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":false,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Darío Crabbe":{"Bullapure":false,"Férula":false,"Osseus Reparo":false,"Tergeo":false,"Examino":false,"Vitae Expulso":false,"Leniter":false,"Sommnium":false,"Anapneo":false,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":false,"Tranquillitas":false,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Jack Marston":{"Bullapure":true,"Férula":false,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":false,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":false,"Medimend":true,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":true,"Revitalizare":true},"Zoey Montes":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":true,"Mind Recupero":true,"Solatio":true,"Finite Incantatem":true,"Confractus":false,"Amicientes":true,"Reparifarge":true,"Panacea":true,"Zanarem":true,"Suturae":true,"Revitalizare":true},"Fiore E. Malfoy":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":false,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":true,"Mind Recupero":false,"Solatio":true,"Finite Incantatem":true,"Confractus":true,"Amicientes":true,"Reparifarge":false,"Panacea":false,"Zanarem":true,"Suturae":true,"Revitalizare":true},"Dustin LaPlace":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":false,"Restitutio Mobilitas":true,"Medimend":true,"Mind Recupero":true,"Solatio":true,"Finite Incantatem":true,"Confractus":true,"Amicientes":false,"Reparifarge":false,"Panacea":true,"Zanarem":true,"Suturae":true,"Revitalizare":true},"Albert Ronin":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":false,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":false,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Aiden Weasley":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":true,"Tergiverso":true,"Vulnera Curatio":true,"Ennervate":true,"Invenio Cardium":true,"Restitutio Mobilitas":true,"Medimend":true,"Mind Recupero":true,"Solatio":true,"Finite Incantatem":true,"Confractus":true,"Amicientes":true,"Reparifarge":true,"Panacea":true,"Zanarem":true,"Suturae":true,"Revitalizare":true},"Zephyr Beckett":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":false,"Anesthetica":true,"Brackium Emendo":false,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":false,"Tergiverso":true,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":true,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":true,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Jacoba Van Dijk":{"Bullapure":true,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":true,"Leniter":true,"Sommnium":true,"Anapneo":false,"Anesthetica":true,"Brackium Emendo":true,"Vitalis":true,"Tranquillitas":true,"Melis Sanitas":false,"Tergiverso":false,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":true,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false},"Rose Silverthorn":{"Bullapure":false,"Férula":true,"Osseus Reparo":true,"Tergeo":true,"Examino":true,"Vitae Expulso":false,"Leniter":true,"Sommnium":true,"Anapneo":true,"Anesthetica":false,"Brackium Emendo":false,"Vitalis":false,"Tranquillitas":true,"Melis Sanitas":false,"Tergiverso":true,"Vulnera Curatio":false,"Ennervate":false,"Invenio Cardium":false,"Restitutio Mobilitas":false,"Medimend":false,"Mind Recupero":false,"Solatio":false,"Finite Incantatem":false,"Confractus":false,"Amicientes":false,"Reparifarge":false,"Panacea":false,"Zanarem":false,"Suturae":false,"Revitalizare":false}};

// =====================================================================
//  HELPERS
// =====================================================================
function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim(); }
function allSpells() { return Object.values(RANKS).flat(); }
function getRkPct(sp, rk) {
  const l = RANKS[rk];
  const d = l.filter(s => sp[s]).length;
  return { done: d, total: l.length, pct: Math.round(d / l.length * 100) };
}
function getCurrentRank(sp) {
  for (let i = RANKS_ORDER.length - 1; i >= 0; i--) {
    if (getRkPct(sp, RANKS_ORDER[i]).pct >= ASCENSO_PCT)
      return RANKS_ORDER[Math.min(i + 1, RANKS_ORDER.length - 1)];
  }
  return RANKS_ORDER[0];
}
function canAscend(sp, rank) {
  const idx = RANKS_ORDER.indexOf(rank);
  if (idx >= RANKS_ORDER.length - 1) return false;
  return getRkPct(sp, rank).pct >= ASCENSO_PCT;
}
function safeStr(n) { return n.replace(/\\/g,"\\\\").replace(/'/g,"\\'"); }
function docId(name)  { return name.replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_]/g,"X"); }

// =====================================================================
//  SHA-256  (Web Crypto API — sin dependencias)
// =====================================================================
const HASH_SALT = "medimagia_v1_";
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(HASH_SALT + str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,"0")).join("");
}

// =====================================================================
//  TOAST
// =====================================================================
function toast(msg, type = "") {
  const wrap = document.getElementById("toastWrap");
  const el   = document.createElement("div");
  el.className = "toast" + (type ? " t" + type : "");
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

// =====================================================================
//  CONFIRM MODAL
// =====================================================================
let _modalResolve = null;
function showModal(title, body, confirmLabel = "Confirmar", btnCls = "danger") {
  document.getElementById("modalTitle").textContent    = title;
  document.getElementById("modalBody").textContent     = body;
  const btn = document.getElementById("modalConfirmBtn");
  btn.textContent = confirmLabel;
  btn.className   = "btn sm " + btnCls;
  document.getElementById("confirmModal").classList.add("show");
  return new Promise(r => { _modalResolve = r; });
}
window.closeModal = function(val) {
  document.getElementById("confirmModal").classList.remove("show");
  if (_modalResolve) { _modalResolve(val); _modalResolve = null; }
};
document.getElementById("confirmModal")
  .addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(false); });

// =====================================================================
//  FIREBASE — alumnos
// =====================================================================
let allStudents  = {};
let allGraduated = {};
let isAdmin      = false;
let adminPwdHash = null;

async function loadAdminConfig() {
  try {
    const ref  = doc(db, "config", "admin");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      adminPwdHash = snap.data().passwordHash;
    } else {
      adminPwdHash = await sha256(DEFAULT_PWD);
      await setDoc(ref, { passwordHash: adminPwdHash });
    }
  } catch {
    adminPwdHash = await sha256(DEFAULT_PWD);
  }
}

async function loadAllStudents() {
  const snap = await getDocs(collection(db, "alumnos"));
  allStudents = {}; allGraduated = {};
  if (snap.empty) {
    for (const [name, spells] of Object.entries(BASE_DATA)) {
      await setDoc(doc(db, "alumnos", docId(name)), { name, spells, graduated: false });
      allStudents[name]  = spells;
      allGraduated[name] = false;
    }
  } else {
    snap.forEach(d => {
      const data = d.data();
      allStudents[data.name]  = data.spells;
      allGraduated[data.name] = data.graduated || false;
    });
  }
}

async function saveStudent(name, spells) {
  await setDoc(doc(db, "alumnos", docId(name)),
    { name, spells, graduated: allGraduated[name] || false });
  allStudents[name] = spells;
}

async function setGraduated(name, val) {
  allGraduated[name] = val;
  await setDoc(doc(db, "alumnos", docId(name)),
    { name, spells: allStudents[name], graduated: val });
}

async function deleteStudent(name) {
  await deleteDoc(doc(db, "alumnos", docId(name)));
  delete allStudents[name];
  delete allGraduated[name];
}

// =====================================================================
//  UI STATE
// =====================================================================
let currentStudent = null;
let pendingChanges = {};

function show(id) {
  ["scSearch","scProfile","scAdminLogin","scAdmin"]
    .forEach(s => document.getElementById(s).style.display = "none");
  document.getElementById(id).style.display = "block";
}

function goSearch() {
  show("scSearch");
  document.getElementById("nameInput").value = "";
  pendingChanges = {}; isAdmin = false;
  renderSuggestions();
}
window.goSearch = goSearch;

function showAdminLogin() {
  show("scAdminLogin");
  document.getElementById("adminPwd").value  = "";
  document.getElementById("adminErr").style.display = "none";
}
window.showAdminLogin = showAdminLogin;

window.backFromProfile = function() {
  if (isAdmin) { show("scAdmin"); renderList(); renderAscensos(); }
  else goSearch();
};

window.cerrarSesion = function() {
  isAdmin = false;
  goSearch();
  toast("Sesión de administrador cerrada");
};

// =====================================================================
//  SEARCH
// =====================================================================
const nameInput = document.getElementById("nameInput");
const sugsEl    = document.getElementById("sugs");

function renderSuggestions() {
  const q = norm(nameInput.value);
  document.getElementById("searchErr").style.display = "none";
  if (q.length < 2) { sugsEl.className = "sug"; return; }
  const m = Object.keys(allStudents).filter(n => norm(n).includes(q)).slice(0, 6);
  if (!m.length) { sugsEl.className = "sug"; return; }
  sugsEl.innerHTML = m.map(n =>
    `<div class="sug-item" onclick="selectName('${safeStr(n)}')">${n}</div>`
  ).join("");
  sugsEl.className = "sug show";
}

nameInput.addEventListener("input", renderSuggestions);
nameInput.addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });
document.addEventListener("click", e => {
  if (!e.target.closest("#scSearch")) sugsEl.className = "sug";
});

window.selectName = function(n) {
  nameInput.value = n; sugsEl.className = "sug"; buscar();
};

window.buscar = function() {
  const q = norm(nameInput.value);
  const found =
    Object.keys(allStudents).find(n => norm(n) === q) ||
    Object.keys(allStudents).find(n => norm(n).includes(q));
  if (!found) { document.getElementById("searchErr").style.display = "block"; return; }
  openProfile(found);
};

// =====================================================================
//  PROFILE
// =====================================================================
function openProfile(name) {
  currentStudent = name;
  pendingChanges = JSON.parse(JSON.stringify(allStudents[name]));
  renderProfile();
  show("scProfile");
  document.getElementById("profileBackBtn").textContent =
    isAdmin ? "← Volver al panel" : "← Volver";
}

function renderProfile() {
  const sp   = pendingChanges;
  const name = currentStudent;
  const grad = allGraduated[name] || false;
  const rank = getCurrentRank(sp);
  const ascending = canAscend(sp, rank);
  const nextRank  = RANKS_ORDER[RANKS_ORDER.indexOf(rank) + 1];
  const all = allSpells();
  const totalPct = Math.round(all.filter(s => sp[s]).length / all.length * 100);

  document.getElementById("pName").textContent = name;
  const rkEl = document.getElementById("pRank");
  if (grad) { rkEl.textContent = "Graduado"; rkEl.className = "rank-badge rk-Graduado"; }
  else       { rkEl.textContent = rank;        rkEl.className = "rank-badge rk-" + rank; }

  document.getElementById("adminBadge").style.display = isAdmin ? "inline" : "none";

  const profileCard = document.querySelector("#scProfile .card");
  profileCard.classList.toggle("grad-card", grad);

  const gradBtn = document.getElementById("gradBtn");
  if (isAdmin) {
    gradBtn.style.display = "inline-flex";
    gradBtn.textContent   = grad ? "✕ Revocar graduación" : "🎓 Graduar alumno";
    gradBtn.className     = grad ? "btn danger" : "btn";
  } else {
    gradBtn.style.display = "none";
  }

  // Banner
  const banner = document.getElementById("ascBanner");
  if (grad) {
    banner.innerHTML = `<div class="grad-banner">
      <div class="grad-icon">🎓</div>
      <div class="big">Graduado/a del Colegio</div>
      <div class="grad-divider"></div>
      <div class="sub">Ha completado su formación con distinción.</div>
    </div>`;
  } else if (ascending && nextRank) {
    banner.innerHTML = `<div class="ascenso-banner">
      <div class="big">✦ Listo para ascender a ${nextRank}</div>
      <div class="sub">Has alcanzado el ${ASCENSO_PCT}% en ${rank}. Contacta con un administrador.</div>
    </div>`;
  } else if (rank === RANKS_ORDER[RANKS_ORDER.length - 1] && getRkPct(sp, rank).pct >= ASCENSO_PCT) {
    banner.innerHTML = `<div class="ascenso-banner">
      <div class="big">✦ Rango máximo alcanzado</div>
      <div class="sub">Has completado todos los hechizos Avanzados.</div>
    </div>`;
  } else {
    const { done, total } = getRkPct(sp, rank);
    const need = Math.ceil(total * ASCENSO_PCT / 100) - done;
    banner.innerHTML = `<div class="no-ascenso-banner">
      <div class="big">Aún no puedes ascender</div>
      <div class="sub">Necesitas ${need} hechizo${need !== 1 ? "s" : ""} más en ${rank} para llegar al ${ASCENSO_PCT}%</div>
    </div>`;
  }

  document.getElementById("pOvPct").textContent = totalPct + "%";
  setTimeout(() => { document.getElementById("pOvBar").style.width = totalPct + "%"; }, 50);

  let tip = "";
  for (const rk of RANKS_ORDER) {
    const { pct } = getRkPct(sp, rk);
    if (pct < 100) {
      const miss = RANKS[rk].filter(s => !sp[s]);
      tip = `Te faltan en <strong>${rk}</strong>: ${miss.join(", ")}.`;
      break;
    }
  }
  document.getElementById("pTip").innerHTML = tip || "Todos los hechizos aprendidos.";

  document.getElementById("pGrid").innerHTML = RANKS_ORDER.map(rk => {
    const { done, total, pct } = getRkPct(sp, rk);
    const cls = pct >= ASCENSO_PCT ? "ok" : pct === 0 ? "no" : "mid";
    const rows = RANKS[rk].map(s => {
      const on  = sp[s];
      const key = s.replace(/[\s.]/g, "_");
      return `<div class="spell-row" onclick="toggleSpell('${safeStr(s)}')">
        <div class="spell-dot ${on ? "on" : "off"}" id="dot_${key}"></div>
        <span class="spell-txt ${on ? "" : "off"}" id="txt_${key}">${s}</span>
      </div>`;
    }).join("");
    return `<div class="rk-card">
      <div class="rk-card-head">
        <span class="rk-card-name">${rk}</span>
        <span class="rk-pct c-${cls}" id="rkpct_${rk}">${done}/${total}</span>
      </div>
      <div class="mini-bar"><div class="mini-fill f-${cls}" id="rkbar_${rk}" style="width:${pct}%"></div></div>
      <div class="spells-list">${rows}</div>
    </div>`;
  }).join("");
}

window.toggleSpell = function(s) {
  pendingChanges[s] = !pendingChanges[s];
  const key = s.replace(/[\s.]/g, "_");
  const dot = document.getElementById("dot_" + key);
  const txt = document.getElementById("txt_" + key);
  if (dot) dot.className = "spell-dot " + (pendingChanges[s] ? "on" : "off");
  if (txt) txt.className = "spell-txt "  + (pendingChanges[s] ? ""   : "off");

  const rk = RANKS_ORDER.find(r => RANKS[r].includes(s));
  if (rk) {
    const { done, total, pct } = getRkPct(pendingChanges, rk);
    const cls = pct >= ASCENSO_PCT ? "ok" : pct === 0 ? "no" : "mid";
    const pEl = document.getElementById("rkpct_" + rk);
    const bEl = document.getElementById("rkbar_"  + rk);
    if (pEl) { pEl.textContent = `${done}/${total}`; pEl.className = "rk-pct c-" + cls; }
    if (bEl) { bEl.style.width = pct + "%";           bEl.className = "mini-fill f-" + cls; }
  }

  const all = allSpells();
  const tp  = Math.round(all.filter(sp => pendingChanges[sp]).length / all.length * 100);
  document.getElementById("pOvPct").textContent = tp + "%";
  document.getElementById("pOvBar").style.width  = tp + "%";

  const rank = getCurrentRank(pendingChanges);
  const rkEl = document.getElementById("pRank");
  rkEl.textContent = rank; rkEl.className = "rank-badge rk-" + rank;

  const ascending = canAscend(pendingChanges, rank);
  const nextRank  = RANKS_ORDER[RANKS_ORDER.indexOf(rank) + 1];
  const banner    = document.getElementById("ascBanner");
  if (ascending && nextRank) {
    banner.innerHTML = `<div class="ascenso-banner"><div class="big">✦ Listo para ascender a ${nextRank}</div><div class="sub">Has alcanzado el ${ASCENSO_PCT}% en ${rank}.</div></div>`;
  } else if (rank === RANKS_ORDER[RANKS_ORDER.length - 1] && getRkPct(pendingChanges, rank).pct >= ASCENSO_PCT) {
    banner.innerHTML = `<div class="ascenso-banner"><div class="big">✦ Rango máximo alcanzado</div></div>`;
  } else {
    const { done: d2, total: t2 } = getRkPct(pendingChanges, rank);
    const need = Math.ceil(t2 * ASCENSO_PCT / 100) - d2;
    banner.innerHTML = `<div class="no-ascenso-banner"><div class="big">Aún no puedes ascender</div><div class="sub">Necesitas ${need} hechizo${need !== 1 ? "s" : ""} más en ${rank}.</div></div>`;
  }
};

window.guardarCambios = async function() {
  const btn = document.getElementById("saveBtn");
  btn.disabled = true; btn.textContent = "Guardando…";
  try {
    await saveStudent(currentStudent, pendingChanges);
    document.getElementById("savedMsg").style.display = "inline";
    setTimeout(() => document.getElementById("savedMsg").style.display = "none", 2500);
    toast("Cambios guardados", "success");
  } catch {
    toast("Error al guardar. Comprueba tu conexión.", "error");
  }
  btn.disabled = false; btn.textContent = "Guardar cambios";
};

// =====================================================================
//  GRADUATION
// =====================================================================
window.toggleGraduation = async function() {
  const name   = currentStudent;
  const newVal = !(allGraduated[name] || false);
  const label  = newVal ? "Graduar" : "Revocar graduación";
  const ok = await showModal(
    `${label}: ${name}`,
    newVal
      ? `¿Confirmas la graduación de ${name}? Aparecerá en el listado de Graduados del Colegio.`
      : `¿Revocar la graduación de ${name}? Volverá a su rango habitual.`,
    label, newVal ? "success" : "danger"
  );
  if (!ok) return;
  await setGraduated(name, newVal);
  toast(newVal ? `${name} graduado/a del Colegio 🎓` : `Graduación de ${name} revocada`, "success");
  renderProfile();
};

// =====================================================================
//  ADMIN — LOGIN
// =====================================================================
window.loginAdmin = async function() {
  const btn = document.querySelector("#scAdminLogin .btn");
  if (btn) { btn.disabled = true; btn.textContent = "Verificando…"; }
  const hash = await sha256(document.getElementById("adminPwd").value);
  if (hash === adminPwdHash) {
    isAdmin = true;
    show("scAdmin");
    renderList(); renderAscensos(); renderGraduados();
  } else {
    document.getElementById("adminErr").style.display = "block";
  }
  if (btn) { btn.disabled = false; btn.textContent = "Entrar"; }
};

// =====================================================================
//  ADMIN — TABS
// =====================================================================
window.showTab = function(id) {
  document.querySelectorAll(".admin-section").forEach(el => el.className = "admin-section");
  document.querySelectorAll(".tab").forEach(el => el.className = "tab");
  document.getElementById(id).className = "admin-section show";
  const idx = { tabList: 0, tabAscensos: 1, tabGrad: 2, tabAdd: 3, tabConfig: 4 }[id];
  document.querySelectorAll(".tab")[idx].className = "tab active";
  if (id === "tabList")     renderList();
  if (id === "tabAscensos") renderAscensos();
  if (id === "tabGrad")     renderGraduados();
};

// =====================================================================
//  ADMIN — LISTA DE ALUMNOS  (con ordenación)
// =====================================================================
let listSort = { key: "name", dir: 1 };

function sortValue(n) {
  const sp   = allStudents[n];
  const grad = allGraduated[n] || false;
  const rk   = getCurrentRank(sp);
  const pct  = Math.round(allSpells().filter(s => sp[s]).length / allSpells().length * 100);
  switch (listSort.key) {
    case "rank":   return grad ? RANKS_ORDER.length : RANKS_ORDER.indexOf(rk);
    case "pct":    return pct;
    case "status": return grad ? 3 : canAscend(sp, rk) ? 2 : 1;
    default:       return norm(n);
  }
}

window.sortList = function(key) {
  if (listSort.key === key) listSort.dir *= -1;
  else { listSort.key = key; listSort.dir = 1; }
  renderList();
};

function sortArrow(key) {
  if (listSort.key !== key) return `<span class="sort-arr">↕</span>`;
  return `<span class="sort-arr on">${listSort.dir === 1 ? "↑" : "↓"}</span>`;
}

window.quickGraduate = async function(name) {
  const grad   = allGraduated[name] || false;
  const newVal = !grad;
  const label  = newVal ? "Graduar del Colegio" : "Revocar graduación";
  const ok = await showModal(
    `${label}: ${name}`,
    newVal
      ? `¿Confirmas la graduación de ${name} del Colegio?`
      : `¿Revocar la graduación de ${name}? Volverá a su rango habitual.`,
    label, newVal ? "success" : "danger"
  );
  if (!ok) return;
  await setGraduated(name, newVal);
  toast(newVal ? `${name} graduado/a del Colegio 🎓` : `Graduación de ${name} revocada`, "success");
  renderList();
  renderGraduados();
};

function renderList() {
  const q = norm(document.getElementById("adminSearch").value || "");
  let names = Object.keys(allStudents).filter(n => !q || norm(n).includes(q));
  names.sort((a, b) => {
    const va = sortValue(a), vb = sortValue(b);
    if (va < vb) return -listSort.dir;
    if (va > vb) return  listSort.dir;
    return norm(a).localeCompare(norm(b));
  });

  if (!names.length) {
    document.getElementById("adminListWrap").innerHTML =
      '<p class="empty-state">No se encontraron alumnos.</p>';
    return;
  }

  const rows = names.map(n => {
    const sp     = allStudents[n];
    const grad   = allGraduated[n] || false;
    const rk     = getCurrentRank(sp);
    const asc    = canAscend(sp, rk);
    const nextRk = RANKS_ORDER[RANKS_ORDER.indexOf(rk) + 1];
    const pct    = Math.round(allSpells().filter(s => sp[s]).length / allSpells().length * 100);
    const safe   = safeStr(n);

    const rankCell = grad
      ? `<span class="rank-badge rk-Graduado" style="font-size:.7rem">Graduado</span>`
      : `<span class="rank-badge rk-${rk}" style="font-size:.7rem">${rk}</span>`;
    const statusCell = grad
      ? `<span class="asc-yes">🎓 Grad.</span>`
      : asc && nextRk ? `<span class="asc-yes">↑ ${nextRk}</span>` : `<span class="asc-no">—</span>`;
    const gradBtnLabel = grad ? "🎓 Grad." : "🎓";
    const gradBtnCls   = `btn btn-grad sm${grad ? " is-grad" : ""}`;
    const gradBtnTitle = grad ? "Revocar graduación" : "Graduar del Colegio";

    return `<tr class="${grad ? "grad-row" : ""}">
      <td>${n}</td>
      <td>${rankCell}</td>
      <td>${pct}%</td>
      <td>${statusCell}</td>
      <td><div class="td-actions">
        <button class="${gradBtnCls}" title="${gradBtnTitle}"
                onclick="quickGraduate('${safe}')">${gradBtnLabel}</button>
        <button class="btn sm" onclick="adminEdit('${safe}')">Ver/Editar</button>
        <button class="btn sm danger" onclick="adminDelete('${safe}')">Eliminar</button>
      </div></td>
    </tr>`;
  }).join("");

  document.getElementById("adminListWrap").innerHTML =
    `<table class="student-table">
      <thead><tr>
        <th class="th-sort" onclick="sortList('name')">Nombre ${sortArrow("name")}</th>
        <th class="th-sort" onclick="sortList('rank')">Rango ${sortArrow("rank")}</th>
        <th class="th-sort" onclick="sortList('pct')">Total ${sortArrow("pct")}</th>
        <th class="th-sort" onclick="sortList('status')">Estado ${sortArrow("status")}</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// =====================================================================
//  ADMIN — ASCENSOS
// =====================================================================
function renderAscensos() {
  const ready = Object.keys(allStudents)
    .filter(n => {
      const sp = allStudents[n]; const rk = getCurrentRank(sp);
      return canAscend(sp, rk) && RANKS_ORDER.indexOf(rk) < RANKS_ORDER.length - 1;
    }).sort();

  if (!ready.length) {
    document.getElementById("ascTable").innerHTML =
      '<p class="empty-state">Ningún alumno cumple el requisito de ascenso ahora mismo.</p>';
    return;
  }
  const rows = ready.map(n => {
    const sp = allStudents[n]; const rk = getCurrentRank(sp);
    const nextRk = RANKS_ORDER[RANKS_ORDER.indexOf(rk) + 1];
    const { pct } = getRkPct(sp, rk);
    const safe = safeStr(n);
    return `<tr>
      <td>${n}</td>
      <td><span class="rank-badge rk-${rk}" style="font-size:.7rem">${rk}</span></td>
      <td>${pct}%</td>
      <td><span class="asc-yes">→ ${nextRk}</span></td>
      <td><button class="btn sm success" onclick="confirmAscend('${safe}','${nextRk}')">Ascender</button></td>
    </tr>`;
  }).join("");

  document.getElementById("ascTable").innerHTML =
    `<table class="student-table">
      <thead><tr><th>Nombre</th><th>Rango actual</th><th>%</th><th>Nuevo rango</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

window.confirmAscend = async function(name, newRank) {
  const ok = await showModal(
    `Ascender a ${name}`,
    `¿Confirmas el ascenso de ${name} a ${newRank}? Se marcarán como aprendidos todos los hechizos de rangos anteriores.`,
    "Ascender", "success"
  );
  if (!ok) return;
  const idx = RANKS_ORDER.indexOf(newRank);
  for (let i = 0; i < idx; i++) RANKS[RANKS_ORDER[i]].forEach(s => allStudents[name][s] = true);
  await saveStudent(name, allStudents[name]);
  toast(`${name} ha ascendido a ${newRank}`, "success");
  renderAscensos(); renderList();
};

// =====================================================================
//  ADMIN — GRADUADOS
// =====================================================================
function renderGraduados() {
  const grads = Object.keys(allStudents).filter(n => allGraduated[n]).sort();
  if (!grads.length) {
    document.getElementById("gradListWrap").innerHTML =
      '<p class="empty-state">Todavía no hay ningún graduado del colegio.</p>';
    return;
  }
  const cards = grads.map(n => {
    const sp  = allStudents[n];
    const all = allSpells();
    const pct = Math.round(all.filter(s => sp[s]).length / all.length * 100);
    const safe = safeStr(n);
    return `<div class="grad-card-item">
      <span class="g-icon">🎓</span>
      <div class="g-name">${n}</div>
      <div class="g-rank">${pct}% completado</div>
      <div class="g-actions">
        <button class="btn sm" onclick="adminEdit('${safe}')">Ver</button>
        <button class="btn sm danger" onclick="adminDelete('${safe}')">Eliminar</button>
      </div>
    </div>`;
  }).join("");
  document.getElementById("gradListWrap").innerHTML =
    `<div class="grad-grid">${cards}</div>`;
}

// =====================================================================
//  ADMIN — EDITAR / ELIMINAR
// =====================================================================
window.adminEdit   = function(name) { openProfile(name); };
window.adminDelete = async function(name) {
  const ok = await showModal(
    "Eliminar alumno",
    `¿Seguro que quieres eliminar a ${name}? Esta acción no se puede deshacer.`,
    "Eliminar", "danger"
  );
  if (!ok) return;
  await deleteStudent(name);
  toast(`${name} eliminado`);
  renderList(); renderAscensos(); renderGraduados();
};

// =====================================================================
//  ADMIN — CREAR ALUMNO
// =====================================================================
let selectedRank = null;
let addSpells    = {};

window.selectRankOpt = function(el) {
  document.querySelectorAll(".rank-opt").forEach(o => o.className = "rank-opt");
  const rank = el.dataset.rank;
  if (selectedRank === rank) {
    selectedRank = null; addSpells = {};
    document.getElementById("spellEditorWrap").style.display = "none";
    return;
  }
  el.className = `rank-opt sel-${rank}`;
  selectedRank = rank;
  addSpells = {};
  allSpells().forEach(s => addSpells[s] = false);
  const idx = RANKS_ORDER.indexOf(rank);
  for (let i = 0; i < idx; i++) RANKS[RANKS_ORDER[i]].forEach(s => addSpells[s] = true);
  buildSpellEditor();
  document.getElementById("spellEditorWrap").style.display = "block";
};

function buildSpellEditor() {
  document.getElementById("spellEditor").innerHTML = RANKS_ORDER.map(rk =>
    `<div class="spell-group-label">${rk}</div>` +
    RANKS[rk].map(s => {
      const key = "addchk_" + s.replace(/[\s.]/g, "_");
      return `<label class="spell-check-row">
        <input type="checkbox" id="${key}" ${addSpells[s] ? "checked" : ""}
               onchange="toggleAddSpell('${safeStr(s)}', this.checked)"/>
        ${s}
      </label>`;
    }).join("")
  ).join("");
}

window.toggleAddSpell = function(s, val) { addSpells[s] = val; };

window.resetAddForm = function() {
  document.getElementById("newName").value = "";
  document.getElementById("addErr").style.display = "none";
  document.getElementById("addOk").style.display  = "none";
  document.querySelectorAll(".rank-opt").forEach(o => o.className = "rank-opt");
  selectedRank = null; addSpells = {};
  document.getElementById("spellEditorWrap").style.display = "none";
};

window.addAlumno = async function() {
  const name  = document.getElementById("newName").value.trim();
  const errEl = document.getElementById("addErr");
  const okEl  = document.getElementById("addOk");
  errEl.style.display = "none"; okEl.style.display = "none";

  if (!name) {
    errEl.textContent = "Escribe un nombre."; errEl.style.display = "block"; return;
  }
  if (allStudents[name]) {
    errEl.textContent = "Ya existe un alumno con ese nombre."; errEl.style.display = "block"; return;
  }

  const spells = selectedRank ? { ...addSpells } : {};
  if (!selectedRank) allSpells().forEach(s => spells[s] = false);

  await saveStudent(name, spells);
  okEl.style.display = "block";
  toast(`Alumno "${name}" creado`, "success");
  setTimeout(() => okEl.style.display = "none", 2500);
  resetAddForm();
  renderList();
};

// =====================================================================
//  ADMIN — CONFIGURACIÓN / CAMBIAR CONTRASEÑA
// =====================================================================
window.updatePwdStrength = function() {
  const pwd  = document.getElementById("pwdNew").value;
  const fill = document.getElementById("pwdStrengthFill");
  let pct = 0, color = "var(--red)";
  if (pwd.length >= 6)  { pct = 25; }
  if (pwd.length >= 8)  { pct = 45; color = "var(--gold)"; }
  if (pwd.length >= 12) { pct = 65; }
  if (pwd.length >= 8  && /[0-9]/.test(pwd))          pct += 15;
  if (pwd.length >= 8  && /[^a-zA-Z0-9]/.test(pwd))   pct += 15;
  if (pwd.length >= 8  && /[A-Z]/.test(pwd))           pct += 5;
  if (pct >= 75) color = "var(--green)";
  fill.style.width      = Math.min(pct, 100) + "%";
  fill.style.background = color;
};

window.changePassword = async function() {
  const current  = document.getElementById("pwdCurrent").value;
  const newPwd   = document.getElementById("pwdNew").value;
  const confirm  = document.getElementById("pwdConfirm").value;
  const errEl    = document.getElementById("pwdErr");
  const okEl     = document.getElementById("pwdOk");
  const btn      = document.querySelector("#tabConfig .btn.success");
  errEl.style.display = "none"; okEl.style.display = "none";

  const currentHash = await sha256(current);
  if (currentHash !== adminPwdHash) {
    errEl.textContent = "La contraseña actual es incorrecta.";
    errEl.style.display = "block"; return;
  }
  if (newPwd.length < 8) {
    errEl.textContent = "La nueva contraseña debe tener al menos 8 caracteres.";
    errEl.style.display = "block"; return;
  }
  if (newPwd !== confirm) {
    errEl.textContent = "Las contraseñas no coinciden.";
    errEl.style.display = "block"; return;
  }

  btn.disabled = true; btn.textContent = "Guardando…";
  const newHash = await sha256(newPwd);
  await setDoc(doc(db, "config", "admin"), { passwordHash: newHash });
  adminPwdHash = newHash;

  document.getElementById("pwdCurrent").value = "";
  document.getElementById("pwdNew").value     = "";
  document.getElementById("pwdConfirm").value = "";
  document.getElementById("pwdStrengthFill").style.width = "0%";

  okEl.style.display = "block";
  setTimeout(() => okEl.style.display = "none", 2500);
  toast("Contraseña actualizada correctamente", "success");
  btn.disabled = false; btn.textContent = "Guardar nueva contraseña";
};

// =====================================================================
//  INIT
// =====================================================================
const loadingEl  = document.getElementById("loadingIndicator");
const searchCard = document.querySelector("#scSearch .card");
loadingEl.style.display    = "block";
searchCard.style.opacity   = "0.4";

Promise.all([loadAllStudents(), loadAdminConfig()])
  .then(() => {
    loadingEl.style.display  = "none";
    searchCard.style.opacity = "1";
  })
  .catch(() => {
    loadingEl.innerHTML =
      '<span style="color:var(--red)">Error al conectar con Firebase. Comprueba las reglas de Firestore.</span>';
  });
