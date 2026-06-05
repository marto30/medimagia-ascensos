import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc, addDoc }
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
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function ipDocId(ip)   { return ip.replace(/\./g, "-"); }
function uaSummary(ua) {
  if (!ua) return "—";
  if (/Edg\//.test(ua))           return "Edge";
  if (/Chrome\//.test(ua))        return "Chrome";
  if (/Firefox\//.test(ua))       return "Firefox";
  if (/Safari\//.test(ua))        return "Safari";
  if (/bot|crawl|spider/i.test(ua)) return "Bot";
  return ua.substring(0, 35) + "…";
}
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
function safeStr(n)  { return n.replace(/\\/g,"\\\\").replace(/'/g,"\\'"); }
function docId(name) { return name.replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_]/g,"X"); }
// Escapa texto para inserción segura en innerHTML
function escHtml(v)  {
  return String(v ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
// Escapa para uso simultáneo en atributo HTML + literal JS dentro de onclick="fn('...')"
function safeAttr(n) {
  return String(n ?? "")
    .replace(/\\/g,"\\\\").replace(/'/g,"\\'")
    .replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// =====================================================================
//  SHA-256  (Web Crypto API — sin dependencias)
// =====================================================================
const HASH_SALT    = "medimagia_v1_";
const IP_HASH_SALT = "medimagia_ip_v2_";
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(HASH_SALT + str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,"0")).join("");
}
async function hashIP(ip) {
  const buf = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(IP_HASH_SALT + ip));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,"0")).join("");
}

// =====================================================================
//  SEGURIDAD — HTTPS · Rate limit · Session timeout
// =====================================================================
// Forzar HTTPS (excepto localhost)
if (location.protocol !== "https:" && !["localhost","127.0.0.1"].includes(location.hostname)) {
  location.replace("https:" + location.href.slice(location.protocol.length));
}

// Rate limiting para login (5 intentos, bloqueo 15 min)
const _LOCK_KEY  = "mm_ll";
const _LOCK_MAX  = 5;
const _LOCK_MS   = 15 * 60 * 1000;
function loginAllowed() {
  try {
    const d = JSON.parse(localStorage.getItem(_LOCK_KEY) || "{}");
    if (!d.since || Date.now() - d.since > _LOCK_MS) return true;
    return (d.count || 0) < _LOCK_MAX;
  } catch { return true; }
}
function loginLockRemaining() {
  try {
    const d = JSON.parse(localStorage.getItem(_LOCK_KEY) || "{}");
    if (!d.since || Date.now() - d.since > _LOCK_MS) return 0;
    return (d.count || 0) >= _LOCK_MAX ? Math.ceil((_LOCK_MS - (Date.now() - d.since)) / 60000) : 0;
  } catch { return 0; }
}
function recordFailedLogin() {
  try {
    const d = JSON.parse(localStorage.getItem(_LOCK_KEY) || "{}");
    const since = d.since && Date.now() - d.since <= _LOCK_MS ? d.since : Date.now();
    localStorage.setItem(_LOCK_KEY, JSON.stringify({ count: (d.count || 0) + 1, since }));
  } catch {}
}
function clearLoginLock() {
  try { localStorage.removeItem(_LOCK_KEY); } catch {}
}

// Session timeout: cierre automático por inactividad (30 min)
const _SESSION_MS = 30 * 60 * 1000;
let _sessionTimer = null;
function resetSessionTimer() {
  if (!isAdmin) return;
  clearTimeout(_sessionTimer);
  _sessionTimer = setTimeout(() => {
    cerrarSesion();
    toast("Sesión cerrada por inactividad", "error");
  }, _SESSION_MS);
}
["click","keydown","touchstart"].forEach(ev =>
  document.addEventListener(ev, resetSessionTimer, { passive: true }));

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
let isAdmin        = false;
let isSuperAdmin   = false;
let adminPwdHash   = null;
let superAdminHash = null;
let visitorIP      = null;

async function loadAdminConfig() {
  try {
    const ref  = doc(db, "config", "admin");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      adminPwdHash   = snap.data().passwordHash;
      superAdminHash = snap.data().superPasswordHash || null;
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
  await setDoc(doc(db, "alumnos", docId(name)), { graduated: val }, { merge: true });
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
  ["scSearch","scProfile","scAdminLogin","scAdmin","scBitacoras","scBlocked"].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = "none";
  });
  const target = document.getElementById(id);
  if (target) target.style.display = "block";
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
  isAdmin = false; isSuperAdmin = false;
  clearTimeout(_sessionTimer); _sessionTimer = null;
  const secBtn = document.getElementById("tabSecurityBtn");
  if (secBtn) secBtn.style.display = "none";
  goSearch();
  toast("Sesión cerrada");
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
    `<div class="sug-item" onclick="selectName('${safeAttr(n)}')">${escHtml(n)}</div>`
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
function renderBitCount(name) {
  const el = document.getElementById("pBitCount");
  if (!el) return;
  if (!bitacorasLoaded) {
    el.innerHTML = `<div class="profile-bit-stats"><div class="profile-bit-stat profile-bit-loading">📋 <span>cargando…</span></div></div>`;
    return;
  }
  const now = new Date();
  const ty = now.getFullYear(), tm = now.getMonth();
  const ly = tm === 0 ? ty - 1 : ty, lm = tm === 0 ? 11 : tm - 1;
  const ct    = bitCntMonth(name, ty, tm);
  const cl    = bitCntMonth(name, ly, lm);
  const total = allBitacoras.filter(b => b.attendants && b.attendants.includes(name)).length;
  const mThis = capitalize(new Date(ty, tm, 1).toLocaleDateString("es-ES", { month: "long" }));
  const mLast = capitalize(new Date(ly, lm, 1).toLocaleDateString("es-ES", { month: "long" }));
  const pill  = (label, n, warn) =>
    `<div class="profile-bit-stat${warn ? " bit-warn" : ""}">` +
    `<span class="bit-label">${label}</span><strong>${n}</strong>` +
    (warn ? `<span class="bit-alert">⚠</span>` : "") +
    `</div>`;
  el.innerHTML = `<div class="profile-bit-stats">
    ${pill(mThis, ct, ct < 3)}
    ${pill(mLast, cl, cl < 3)}
    ${pill("Total", total, false)}
  </div>`;
}

function openProfile(name) {
  currentStudent = name;
  pendingChanges = JSON.parse(JSON.stringify(allStudents[name]));
  renderProfile();
  show("scProfile");
  document.getElementById("profileBackBtn").textContent =
    isAdmin ? "← Volver al panel" : "← Volver";
  if (!bitacorasLoaded) {
    renderBitCount(name);
    loadBitacoras()
      .then(() => { bitacorasLoaded = true; renderBitCount(name); })
      .catch(() => {
        const el = document.getElementById("pBitCount");
        if (el) el.innerHTML = "";
      });
  }
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
  renderBitCount(name);

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
      return `<div class="spell-row" onclick="toggleSpell('${safeAttr(s)}')">
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
function applyAdminRole() {
  const secBtn = document.getElementById("tabSecurityBtn");
  if (secBtn) secBtn.style.display = isSuperAdmin ? "" : "none";
  // Sección de config: admin normal ve "Establecer superadmin", superadmin no
  const superSection = document.getElementById("superAdminPwdSection");
  if (superSection) superSection.style.display = isSuperAdmin ? "none" : "block";
}

window.loginAdmin = async function() {
  const remaining = loginLockRemaining();
  if (remaining > 0) {
    document.getElementById("adminErr").textContent =
      `Demasiados intentos. Espera ${remaining} minuto${remaining !== 1 ? "s" : ""}.`;
    document.getElementById("adminErr").style.display = "block";
    return;
  }
  const btn = document.querySelector("#scAdminLogin .btn");
  if (btn) { btn.disabled = true; btn.textContent = "Verificando…"; }
  const hash = await sha256(document.getElementById("adminPwd").value);

  if (superAdminHash && hash === superAdminHash) {
    isAdmin = true; isSuperAdmin = true;
  } else if (hash === adminPwdHash) {
    isAdmin = true; isSuperAdmin = false;
  } else {
    recordFailedLogin();
    const left = loginLockRemaining();
    const errEl = document.getElementById("adminErr");
    errEl.textContent = left > 0
      ? `Contraseña incorrecta. Cuenta bloqueada ${left} min.`
      : "Contraseña incorrecta.";
    errEl.style.display = "block";
    if (btn) { btn.disabled = false; btn.textContent = "Entrar"; }
    return;
  }

  clearLoginLock();
  document.getElementById("adminPwd").value = "";
  applyAdminRole();
  show("scAdmin");
  renderList(); renderAscensos(); renderGraduados();
  resetSessionTimer();
  if (!bitacorasLoaded) {
    loadBitacoras().then(() => { bitacorasLoaded = true; renderList(); }).catch(() => {});
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
  const idx = { tabList: 0, tabAscensos: 1, tabActivity: 2, tabGrad: 3, tabAdd: 4, tabSecurity: 5, tabConfig: 6 }[id];
  document.querySelectorAll(".tab")[idx].className =
    id === "tabSecurity" ? "tab tab-security active" : "tab active";
  if (id === "tabList")     renderList();
  if (id === "tabAscensos") renderAscensos();
  if (id === "tabActivity") renderPocaActividad();
  if (id === "tabGrad")     renderGraduados();
  if (id === "tabSecurity") { if (isSuperAdmin) renderSecurityTab(); }
};

// =====================================================================
//  ADMIN — LISTA DE ALUMNOS  (con ordenación)
// =====================================================================
let listSort = { key: "name", dir: 1 };

function bitCntMonth(name, y, m) {
  return allBitacoras.filter(b => {
    if (!b.attendants || !b.attendants.includes(name) || !b.createdAt) return false;
    const d = new Date(b.createdAt);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

function sortValue(n) {
  const sp  = allStudents[n];
  const rk  = getCurrentRank(sp);
  const pct = Math.round(allSpells().filter(s => sp[s]).length / allSpells().length * 100);
  if (listSort.key === "thisMonth") {
    const now = new Date();
    return bitCntMonth(n, now.getFullYear(), now.getMonth());
  }
  if (listSort.key === "lastMonth") {
    const now = new Date();
    const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return bitCntMonth(n, ly, lm);
  }
  switch (listSort.key) {
    case "pct":    return pct;
    case "status": return canAscend(sp, rk) ? 1 : 0;
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

function buildStudentRow(n) {
  const sp     = allStudents[n];
  const grad   = allGraduated[n] || false;
  const rk     = getCurrentRank(sp);
  const asc    = canAscend(sp, rk);
  const nextRk = RANKS_ORDER[RANKS_ORDER.indexOf(rk) + 1];
  const pct    = Math.round(allSpells().filter(s => sp[s]).length / allSpells().length * 100);
  const safe   = safeAttr(n);
  const statusCell = grad
    ? `<span class="asc-yes">🎓 Graduado</span>`
    : asc && nextRk ? `<span class="asc-yes">↑ ${nextRk}</span>` : `<span class="asc-no">—</span>`;
  const gradBtnCls   = `btn btn-grad sm${grad ? " is-grad" : ""}`;
  const gradBtnTitle = grad ? "Revocar graduación" : "Graduar del Colegio";
  const gradBtnLabel = grad ? "🎓 Grad." : "🎓";

  let thisCell, lastCell;
  if (!bitacorasLoaded) {
    thisCell = lastCell = `<span class="bit-count-zero">—</span>`;
  } else {
    const now = new Date();
    const ty = now.getFullYear(), tm = now.getMonth();
    const ly = tm === 0 ? ty - 1 : ty, lm = tm === 0 ? 11 : tm - 1;
    const ct = bitCntMonth(n, ty, tm), cl = bitCntMonth(n, ly, lm);
    thisCell = `<span class="bit-count-badge${ct < 3 ? " bit-count-warn" : ""}">${ct}</span>`;
    lastCell = `<span class="bit-count-badge${cl < 3 ? " bit-count-warn" : ""}">${cl}</span>`;
  }

  return `<tr class="${grad ? "grad-row" : ""}">
    <td>${escHtml(n)}</td>
    <td>${pct}%</td>
    <td>${statusCell}</td>
    <td style="text-align:center">${thisCell}</td>
    <td style="text-align:center">${lastCell}</td>
    <td><div class="td-actions">
      <button class="${gradBtnCls}" title="${gradBtnTitle}"
              onclick="quickGraduate('${safe}')">${gradBtnLabel}</button>
      <button class="btn sm" onclick="adminEdit('${safe}')">Ver/Editar</button>
      <button class="btn sm danger" onclick="adminDelete('${safe}')">Eliminar</button>
    </div></td>
  </tr>`;
}

function buildRankTable(members) {
  const now = new Date();
  const ty = now.getFullYear(), tm = now.getMonth();
  const ly = tm === 0 ? ty - 1 : ty, lm = tm === 0 ? 11 : tm - 1;
  const mThis = capitalize(new Date(ty, tm, 1).toLocaleDateString("es-ES", { month: "short" }));
  const mLast = capitalize(new Date(ly, lm, 1).toLocaleDateString("es-ES", { month: "short" }));
  return `<table class="student-table">
    <thead><tr>
      <th class="th-sort" onclick="sortList('name')">Nombre ${sortArrow("name")}</th>
      <th class="th-sort" onclick="sortList('pct')">Total % ${sortArrow("pct")}</th>
      <th class="th-sort" onclick="sortList('status')">Estado ${sortArrow("status")}</th>
      <th class="th-sort" onclick="sortList('thisMonth')" title="Bitácoras este mes">📋 ${mThis} ${sortArrow("thisMonth")}</th>
      <th class="th-sort" onclick="sortList('lastMonth')" title="Bitácoras el mes pasado">📋 ${mLast} ${sortArrow("lastMonth")}</th>
      <th></th>
    </tr></thead>
    <tbody>${members.map(buildStudentRow).join("")}</tbody>
  </table>`;
}

function renderList() {
  const q = norm(document.getElementById("adminSearch").value || "");
  const allNames = Object.keys(allStudents).filter(n => !q || norm(n).includes(q));

  if (!allNames.length) {
    document.getElementById("adminListWrap").innerHTML =
      '<p class="empty-state">No se encontraron alumnos.</p>';
    return;
  }

  // Agrupar por rango — graduados se quedan en su rango
  const groups = {};
  for (const rk of RANKS_ORDER) groups[rk] = [];
  for (const n of allNames) groups[getCurrentRank(allStudents[n])].push(n);

  // Ordenar dentro de cada grupo con el sort activo
  const sorter = (a, b) => {
    const va = sortValue(a), vb = sortValue(b);
    if (va < vb) return -listSort.dir;
    if (va > vb) return  listSort.dir;
    return norm(a).localeCompare(norm(b));
  };
  for (const rk of RANKS_ORDER) groups[rk].sort(sorter);

  const rkBadge = { Aprendiz:"rk-Aprendiz", Principiante:"rk-Principiante",
                    Intermedio:"rk-Intermedio", Avanzado:"rk-Avanzado" };

  const html = RANKS_ORDER.map(rk => {
    const members = groups[rk];
    if (!members.length) return "";
    const count = members.length;
    return `<div class="rank-section">
      <div class="rank-section-header">
        <span class="rank-badge ${rkBadge[rk]}">${rk}</span>
        <span class="rank-count">${count} alumno${count !== 1 ? "s" : ""}</span>
      </div>
      ${buildRankTable(members)}
    </div>`;
  }).join("");

  const totalAll    = Object.keys(allStudents).length;
  const totalGrad   = Object.values(allGraduated).filter(Boolean).length;
  const totalActive = totalAll - totalGrad;

  const summary = `<div class="list-summary">
    <div class="list-summary-stat">
      <strong>${totalActive}</strong> sin graduar
    </div>
    <span class="list-summary-divider">·</span>
    <div class="list-summary-stat highlight">
      <strong>${totalGrad}</strong> graduados
    </div>
    <span class="list-summary-divider">·</span>
    <div class="list-summary-stat">
      <strong>${totalAll}</strong> total
    </div>
  </div>`;

  document.getElementById("adminListWrap").innerHTML = summary + html;
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
    const safe = safeAttr(n);
    return `<tr>
      <td>${escHtml(n)}</td>
      <td><span class="rank-badge rk-${rk}" style="font-size:.7rem">${escHtml(rk)}</span></td>
      <td>${pct}%</td>
      <td><span class="asc-yes">→ ${escHtml(nextRk)}</span></td>
      <td><button class="btn sm success" onclick="confirmAscend('${safe}','${safeAttr(nextRk)}')">Ascender</button></td>
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
    const safe = safeAttr(n);
    return `<div class="grad-card-item">
      <span class="g-icon">🎓</span>
      <div class="g-name">${escHtml(n)}</div>
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
//  ADMIN — POCA ACTIVIDAD
// =====================================================================
function renderPocaActividad() {
  const wrap = document.getElementById("activityWrap");
  if (!wrap) return;

  if (!bitacorasLoaded) {
    wrap.innerHTML = '<div class="loading"><span class="spinner"></span>Cargando bitácoras…</div>';
    loadBitacoras()
      .then(() => { bitacorasLoaded = true; renderPocaActividad(); renderList(); })
      .catch(() => {
        wrap.innerHTML = '<p class="notice" style="color:var(--red)">Error al cargar bitácoras.</p>';
      });
    return;
  }

  const now = new Date();
  const ty = now.getFullYear(), tm = now.getMonth();
  const ly = tm === 0 ? ty - 1 : ty, lm = tm === 0 ? 11 : tm - 1;
  const mThisName = capitalize(new Date(ty, tm, 1).toLocaleDateString("es-ES", { month: "long" }));
  const mLastName = capitalize(new Date(ly, lm, 1).toLocaleDateString("es-ES", { month: "long" }));

  const students = Object.keys(allStudents).map(n => ({
    name: n,
    rank: getCurrentRank(allStudents[n]),
    ct: bitCntMonth(n, ty, tm),
    cl: bitCntMonth(n, ly, lm)
  }))
  .filter(s => s.cl < 3)
  .sort((a, b) => a.cl - b.cl || norm(a.name).localeCompare(norm(b.name)));

  if (!students.length) {
    wrap.innerHTML = '<p class="empty-state">✓ Todos los medimagos tienen 3 o más bitácoras el mes pasado.</p>';
    return;
  }

  const rows = students.map(s => {
    const safe  = safeAttr(s.name);
    const rkCls = `rk-${s.rank}`;
    return `<tr>
      <td>${escHtml(s.name)}</td>
      <td><span class="rank-badge ${rkCls}" style="font-size:.7rem">${escHtml(s.rank)}</span></td>
      <td style="text-align:center"><span class="bit-count-badge bit-count-warn">${s.cl}</span></td>
      <td style="text-align:center"><span class="bit-count-badge${s.ct < 3 ? " bit-count-warn" : ""}">${s.ct}</span></td>
      <td><button class="btn sm" onclick="adminEdit('${safe}')">Ver</button></td>
    </tr>`;
  }).join("");

  wrap.innerHTML = `
    <div class="activity-notice">
      <strong>${students.length}</strong> medimago${students.length !== 1 ? "s" : ""}
      con menos de 3 bitácoras en ${mLastName}.
    </div>
    <table class="student-table">
      <thead><tr>
        <th>Nombre</th><th>Rango</th>
        <th>📋 ${mLastName} (pasado)</th>
        <th>📋 ${mThisName} (actual)</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
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
               onchange="toggleAddSpell('${safeAttr(s)}', this.checked)"/>
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
//  BITÁCORAS (pantalla pública)
// =====================================================================
let allBitacoras    = [];
let bitacorasFrom   = "search";
let bitacorasLoaded = false;

window.showBitacoras = async function(from = "search") {
  try {
    bitacorasFrom = from;
    show("scBitacoras");

    if (!bitacorasLoaded) {
      document.getElementById("bitacoraListWrap").innerHTML =
        '<div class="loading"><span class="spinner"></span>Cargando bitácoras…</div>';
      document.getElementById("attendantsList").innerHTML = buildAttendantsList();
      document.getElementById("spellInserter").innerHTML  = buildSpellInserter();
      try {
        await loadBitacoras();
        bitacorasLoaded = true;
      } catch (e) {
        console.error("Error cargando bitácoras:", e);
        document.getElementById("bitacoraListWrap").innerHTML =
          `<p class="notice" style="color:var(--red)">
            No se pudieron cargar las bitácoras.<br>
            <small>Comprueba las reglas de Firestore: la colección <em>bitacoras</em> necesita permisos de lectura.</small>
          </p>`;
        return;
      }
    }

    renderBitacoraList();
  } catch (e) {
    console.error("showBitacoras error:", e);
    toast("Error al abrir bitácoras. Revisa la consola.", "error");
  }
};

window.backFromBitacoras = function() {
  if (bitacorasFrom === "admin") show("scAdmin");
  else goSearch();
};

async function loadBitacoras() {
  const snap = await getDocs(collection(db, "bitacoras"));
  allBitacoras = [];
  snap.forEach(d => allBitacoras.push({ id: d.id, ...d.data() }));
  allBitacoras.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Las mutaciones locales (add/delete) actualizan allBitacoras en memoria,
  // por lo que no hace falta volver a leer de Firestore.
}

// ── Insertor de hechizos ──────────────────────────────────────────────
function buildSpellInserter() {
  const groups = RANKS_ORDER.map(rk =>
    `<div class="si-group">
      <span class="si-rank">${rk}</span>
      <div class="si-spells">
        ${RANKS[rk].map(s =>
          `<button class="si-btn" type="button" onclick="insertSpell('${safeAttr(s)}')">${escHtml(s)}</button>`
        ).join("")}
      </div>
    </div>`
  ).join("");
  return `<div class="si-label">Insertar hechizo:</div>${groups}`;
}

window.insertSpell = function(spell) {
  const ta  = document.getElementById("bitProc");
  const pos = ta.selectionStart;
  const pre = ta.value.substring(0, pos);
  const suf = ta.value.substring(ta.selectionEnd);
  const sep = pre && !pre.endsWith(" ") && !pre.endsWith("\n") ? " " : "";
  ta.value  = pre + sep + spell + suf;
  ta.focus();
  const cur = pos + sep.length + spell.length;
  ta.selectionStart = ta.selectionEnd = cur;
};

// ── Lista de asistentes (de la BD) ───────────────────────────────────
function buildAttendantsList(filterQ = "") {
  const names = Object.keys(allStudents)
    .filter(n => !filterQ || norm(n).includes(norm(filterQ)))
    .sort();
  if (!names.length) return '<p style="color:#4a4540;font-size:.8rem;padding:.4rem">No hay medimagos en la base de datos.</p>';
  return names.map(n =>
    `<label class="attendant-item">
      <input type="checkbox" class="att-chk" value="${escHtml(n)}"/> ${escHtml(n)}
    </label>`
  ).join("");
}

window.filterAttendants = function() {
  const q = document.getElementById("attendantSearch").value;
  document.getElementById("attendantsList").innerHTML = buildAttendantsList(q);
};

window.resetBitacoraForm = function() {
  ["bitPatient","bitDiag","bitProc","attendantSearch"].forEach(id =>
    document.getElementById(id).value = "");
  document.getElementById("bitErr").style.display = "none";
  document.getElementById("bitOk").style.display  = "none";
  document.getElementById("attendantsList").innerHTML = buildAttendantsList();
};

window.saveBitacoraEntry = async function() {
  const patient    = document.getElementById("bitPatient").value.trim();
  const diagnosis  = document.getElementById("bitDiag").value.trim();
  const procedure  = document.getElementById("bitProc").value.trim();
  const attendants = [...document.querySelectorAll(".att-chk:checked")].map(c => c.value);
  const errEl = document.getElementById("bitErr");
  const okEl  = document.getElementById("bitOk");
  errEl.style.display = "none"; okEl.style.display = "none";

  if (!patient)           { errEl.textContent = "El nombre del paciente es obligatorio."; errEl.style.display = "block"; return; }
  if (!diagnosis)         { errEl.textContent = "El diagnóstico es obligatorio.";          errEl.style.display = "block"; return; }
  if (!procedure)         { errEl.textContent = "El procedimiento es obligatorio.";         errEl.style.display = "block"; return; }
  if (!attendants.length) { errEl.textContent = "Selecciona al menos un medimago.";         errEl.style.display = "block"; return; }

  const entry = { patient, diagnosis, procedure, attendants, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, "bitacoras"), entry);
  allBitacoras.unshift({ id: ref.id, ...entry });
  toast("Bitácora guardada", "success");
  okEl.style.display = "block";
  setTimeout(() => okEl.style.display = "none", 2500);
  resetBitacoraForm();
  renderBitacoraList();
};

window.deleteBitacora = async function(id) {
  const ok = await showModal("Eliminar bitácora",
    "¿Seguro que quieres eliminar esta bitácora? No se puede deshacer.",
    "Eliminar", "danger");
  if (!ok) return;
  await deleteDoc(doc(db, "bitacoras", id));
  allBitacoras = allBitacoras.filter(b => b.id !== id);
  toast("Bitácora eliminada");
  renderBitacoraList();
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function renderBitacoraList() {
  const wrap = document.getElementById("bitacoraListWrap");
  if (!allBitacoras.length) {
    wrap.innerHTML = '<p class="empty-state">Todavía no hay ninguna bitácora registrada.</p>';
    return;
  }
  wrap.innerHTML = allBitacoras.map(b => `
    <div class="bitacora-card">
      <div class="bitacora-top">
        <div>
          <div class="bitacora-patient">${escHtml(b.patient)}</div>
          <div class="bitacora-date">${formatDate(b.createdAt)}</div>
        </div>
        ${isAdmin ? `<button class="btn sm danger" onclick="deleteBitacora('${b.id}')">Eliminar</button>` : ""}
      </div>
      <div class="bitacora-field">
        <span class="bitacora-label">Diagnóstico</span>
        <span class="bitacora-value">${escHtml(b.diagnosis)}</span>
      </div>
      <div class="bitacora-field">
        <span class="bitacora-label">Procedimiento</span>
        <span class="bitacora-value bitacora-proc">${escHtml(b.procedure)}</span>
      </div>
      <div class="bitacora-field">
        <span class="bitacora-label">Atendido por</span>
        <div class="bitacora-attendants">${(b.attendants || []).map(a =>
          `<span class="att-badge">${escHtml(a)}</span>`).join("")}</div>
      </div>
    </div>`).join("");
}

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
  const activeHash  = isSuperAdmin ? superAdminHash : adminPwdHash;
  if (currentHash !== activeHash) {
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
  const field   = isSuperAdmin ? "superPasswordHash" : "passwordHash";
  await setDoc(doc(db, "config", "admin"), { [field]: newHash }, { merge: true });
  if (isSuperAdmin) superAdminHash = newHash; else adminPwdHash = newHash;

  document.getElementById("pwdCurrent").value = "";
  document.getElementById("pwdNew").value     = "";
  document.getElementById("pwdConfirm").value = "";
  document.getElementById("pwdStrengthFill").style.width = "0%";

  okEl.style.display = "block";
  setTimeout(() => okEl.style.display = "none", 2500);
  toast("Contraseña actualizada correctamente", "success");
  btn.disabled = false; btn.textContent = "Guardar nueva contraseña";
};

window.setSuperAdminPwd = async function() {
  const newPwd  = document.getElementById("pwdSuperNew").value;
  const confirm = document.getElementById("pwdSuperConfirm").value;
  const errEl   = document.getElementById("pwdSuperErr");
  const okEl    = document.getElementById("pwdSuperOk");
  errEl.style.display = "none"; okEl.style.display = "none";

  if (newPwd.length < 8) {
    errEl.textContent = "Mínimo 8 caracteres."; errEl.style.display = "block"; return;
  }
  if (newPwd !== confirm) {
    errEl.textContent = "Las contraseñas no coinciden."; errEl.style.display = "block"; return;
  }
  const hash = await sha256(newPwd);
  await setDoc(doc(db, "config", "admin"), { superPasswordHash: hash }, { merge: true });
  superAdminHash = hash;
  document.getElementById("pwdSuperNew").value     = "";
  document.getElementById("pwdSuperConfirm").value = "";
  okEl.style.display = "block";
  setTimeout(() => okEl.style.display = "none", 2500);
  toast("Contraseña de superadmin guardada", "success");
};

// =====================================================================
//  SEGURIDAD — monitoreo de accesos y bloqueo por IP
// =====================================================================
async function initSecurity() {
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 4000);
    const res  = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    clearTimeout(tid);
    const { ip } = await res.json();
    // Nunca almacenamos la IP real — solo su hash irreversible
    const ipHash = await hashIP(ip);
    visitorIP = ipHash; // guardamos el hash, no la IP

    const blockSnap = await getDoc(doc(db, "blocked_ips", ipHash));
    if (blockSnap.exists()) { show("scBlocked"); return; }

    // Registrar visita: solo hash + timestamp + navegador resumido (fire & forget)
    addDoc(collection(db, "access_logs"), {
      ip: ipHash,
      ts: new Date().toISOString(),
      ua: uaSummary(navigator.userAgent) // nunca el UA completo
    }).catch(() => {});
  } catch { /* fallo silencioso */ }
}

async function renderSecurityTab() {
  const wrap = document.getElementById("securityWrap");
  if (!wrap) return;
  wrap.innerHTML = '<div class="loading"><span class="spinner"></span>Cargando seguridad…</div>';
  try {
    const [logSnap, blockSnap] = await Promise.all([
      getDocs(collection(db, "access_logs")),
      getDocs(collection(db, "blocked_ips"))
    ]);

    const logs = [];
    logSnap.forEach(d => logs.push({ id: d.id, ...d.data() }));
    logs.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
    const recent = logs.slice(0, 100);

    const blocked = {};
    blockSnap.forEach(d => { blocked[d.data().ip] = d.data(); });

    // Los hashes de IP son hex seguros — no necesitan escapeHtml
    // — IPs bloqueadas —
    const blockedList = Object.values(blocked);
    const blockedHtml = !blockedList.length
      ? '<p class="empty-state">No hay IPs bloqueadas.</p>'
      : `<table class="student-table">
          <thead><tr><th>Hash IP</th><th>Bloqueada</th><th></th></tr></thead>
          <tbody>${blockedList.map(b => `<tr class="blocked-row">
            <td class="ip-cell">${b.ip.substring(0,16)}…${b.ip === visitorIP ? ' <span class="ip-you-badge">tú</span>' : ""}</td>
            <td>${formatDate(b.blockedAt)}</td>
            <td><button class="btn sm success" onclick="unblockIP('${b.ip}')">Desbloquear</button></td>
          </tr>`).join("")}</tbody>
        </table>`;

    // — Registro de accesos —
    const logsHtml = !recent.length
      ? '<p class="empty-state">Sin registros de acceso aún.</p>'
      : `<table class="student-table">
          <thead><tr><th>Hash IP</th><th>Fecha</th><th>Navegador</th><th></th></tr></thead>
          <tbody>${recent.map(l => {
            const isBlk = !!blocked[l.ip];
            return `<tr class="${isBlk ? "blocked-row" : ""}">
              <td class="ip-cell">${escHtml(l.ip).substring(0,16)}…
                ${l.ip === visitorIP ? '<span class="ip-you-badge">tú</span>' : ""}
                ${isBlk ? '<span class="ip-blocked-badge">bloqueada</span>' : ""}
              </td>
              <td>${l.ts ? formatDate(l.ts) : "—"}</td>
              <td class="ua-cell">${escHtml(l.ua || "—")}</td>
              <td>${!isBlk
                ? `<button class="btn sm danger" onclick="blockIP('${l.ip}')">Bloquear</button>`
                : `<button class="btn sm success" onclick="unblockIP('${l.ip}')">Desbloquear</button>`}
              </td>
            </tr>`;
          }).join("")}</tbody>
        </table>`;

    wrap.innerHTML = `
      <div class="sec-section">
        <p class="sec-title">🚫 IPs bloqueadas <span class="sec-count">${blockedList.length}</span></p>
        ${blockedHtml}
      </div>
      <div class="sec-section" style="margin-top:1.6rem">
        <p class="sec-title">📋 Últimos ${recent.length} accesos
          <button class="btn sm ghost" style="margin-left:.6rem" onclick="clearOldLogs()">Limpiar logs</button>
        </p>
        ${logsHtml}
      </div>`;
  } catch (e) {
    wrap.innerHTML = `<p class="notice" style="color:var(--red)">Error al cargar datos: ${e.message}</p>`;
  }
}

window.blockIP = async function(ip) {
  const ok = await showModal(
    "Bloquear IP",
    `¿Bloquear acceso desde ${ip}? No podrá acceder a la web.`,
    "Bloquear", "danger"
  );
  if (!ok) return;
  await setDoc(doc(db, "blocked_ips", ipDocId(ip)), { ip, blockedAt: new Date().toISOString() });
  toast(`IP ${ip} bloqueada`, "error");
  renderSecurityTab();
};

window.unblockIP = async function(ip) {
  await deleteDoc(doc(db, "blocked_ips", ipDocId(ip)));
  toast(`IP ${ip} desbloqueada`, "success");
  renderSecurityTab();
};

window.clearOldLogs = async function() {
  const ok = await showModal(
    "Limpiar registros",
    "¿Eliminar todos los registros de acceso? Los bloqueos activos no se verán afectados.",
    "Limpiar", "danger"
  );
  if (!ok) return;
  const snap = await getDocs(collection(db, "access_logs"));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  toast("Registros eliminados", "success");
  renderSecurityTab();
};

// =====================================================================
//  INIT
// =====================================================================
const loadingEl  = document.getElementById("loadingIndicator");
const searchCard = document.querySelector("#scSearch .card");
loadingEl.style.display    = "block";
searchCard.style.opacity   = "0.4";

initSecurity(); // corre en paralelo: detecta IP, verifica bloqueo y registra visita

Promise.all([loadAllStudents(), loadAdminConfig()])
  .then(() => {
    loadingEl.style.display  = "none";
    searchCard.style.opacity = "1";
  })
  .catch(() => {
    loadingEl.innerHTML =
      '<span style="color:var(--red)">Error al conectar con Firebase. Comprueba las reglas de Firestore.</span>';
  });
