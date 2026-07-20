export interface GroundTruthCV {
  id: string;
  name: string;
  layoutType: "standard_word" | "canva_multicolumn" | "europass" | "linkedin_export" | "scrambled_custom" | "misspelled_nonstandard";
  language: "tr" | "en";
  rawText: string;
  expectedSections: string[]; // Section keys expected: personal, experience, education, skills, projects, certifications, etc.
}

export const GROUND_TRUTH_CVS: GroundTruthCV[] = [
  // 1. Standard Word TR
  {
    id: "cv_01_word_tr",
    name: "Standart Word CV (TR)",
    layoutType: "standard_word",
    language: "tr",
    rawText: `Ahmet Yılmaz
ahmet.yilmaz@email.com | +90 555 111 2233 | İstanbul, Türkiye | linkedin.com/in/ahmetyilmaz

ÖZET
Deneyimli Yazılım Geliştirici. Node.js, React ve PostgreSQL projelerinde 5 yıl deneyim.

İŞ DENEYİMİ
Senior Software Engineer - ABC Teknoloji (Ocak 2022 - Halen)
- Microservice mimarisi ile backend geliştirme yapıldı.
- PostgreSQL sorguları %40 optimize edildi.

Yazılım Geliştirici - XYZ Yazılım (Haziran 2019 - Aralık 2021)
- React.js kullanarak frontend bileşenleri oluşturuldu.

EĞİTİM
İstanbul Teknik Üniversitesi - Bilgisayar Mühendisliği (Lisans, 2015 - 2019)

YETENEKLER
JavaScript, TypeScript, Node.js, React, Docker, Git, PostgreSQL

SERTİFİKALAR
- AWS Certified Developer Associate (2023)
- Certified Scrum Master (2022)
`,
    expectedSections: ["personal", "summary", "experience", "education", "skills", "certifications"]
  },

  // 2. Standard Word EN
  {
    id: "cv_02_word_en",
    name: "Standard Word CV (EN)",
    layoutType: "standard_word",
    language: "en",
    rawText: `Jane Doe
jane.doe@email.com | +1 555 987 6543 | New York, USA | github.com/janedoe

PROFESSIONAL SUMMARY
Results-driven Full Stack Developer with 6+ years of experience building scalable web applications.

WORK EXPERIENCE
Lead Software Developer - Acme Corp (March 2021 - Present)
- Led a team of 6 engineers in migrating legacy monolith to AWS microservices.
- Improved API response times by 55% using Redis caching.

Software Engineer - Tech Solutions Inc. (July 2018 - February 2021)
- Developed responsive web applications using React and TypeScript.

EDUCATION
Bachelor of Science in Computer Science - Columbia University (2014 - 2018)

TECHNICAL SKILLS
TypeScript, React, Node.js, Python, PostgreSQL, AWS, GraphQL

CERTIFICATIONS
AWS Certified Solutions Architect (2022)
`,
    expectedSections: ["personal", "summary", "experience", "education", "skills", "certifications"]
  },

  // 3. Canva Multicolumn TR
  {
    id: "cv_03_canva_tr",
    name: "Canva İki Sütunlu Tasarım (TR)",
    layoutType: "canva_multicolumn",
    language: "tr",
    rawText: `Zeynep Kaya
zeynep.kaya@email.com
+90 532 999 8877
KİŞİSEL BİLGİLER
Doğum Tarihi: 15.04.1994
Sürücü Ehliyeti: B

MESLEKİ GEÇMİŞ
Kıdemli Ürün Yöneticisi | Tekno Holding (2021 - Günümüz)
- Ürün stratejisi belirlendi ve MVP süreçleri yönetildi.
- Kullanıcı araştırmaları yapılarak retention %25 artırıldı.

Proje Yöneticisi | Dijital Ajans (2018 - 2021)
- Agil/Scrum metodolojisi ile 10+ proje başarıyla tamamlandı.

ÖĞRENİM BİLGİLERİ
Boğaziçi Üniversitesi - Endüstri Mühendisliği (2012 - 2017)

YETENEK & BECERİLER
Ürün Yönetimi, Jira, Figma, Agile, SQL, Veri Analizi

YABANCI DİLLER
İngilizce (İleri Seviye C1)
Almanca (Orta Seviye B1)
`,
    expectedSections: ["personal", "experience", "education", "skills", "languages"]
  },

  // 4. Canva Multicolumn EN
  {
    id: "cv_04_canva_en",
    name: "Canva Multi-column Design (EN)",
    layoutType: "canva_multicolumn",
    language: "en",
    rawText: `Alex Smith
alex.smith@email.com | San Francisco, CA | (555) 234-5678

ABOUT ME
Passionate Data Scientist with expertise in Machine Learning, NLP, and Deep Learning.

EXPERIENCE
Senior Data Scientist - AI Labs Inc. (2022 - Present)
- Trained LLM fine-tuning pipelines using PyTorch and HuggingFace.
- Built real-time inference endpoint servicing 1M daily requests.

Data Analyst - Data Corp (2019 - 2022)
- Built automated ETL pipelines in Apache Airflow and BigQuery.

ACADEMIC BACKGROUND
M.S. in Data Science - Stanford University (2017 - 2019)
B.S. in Applied Mathematics - UC Berkeley (2013 - 2017)

SKILLS & TOOLS
Python, PyTorch, SQL, Scikit-Learn, TensorFlow, Docker, Kubernetes

PUBLICATIONS
- "Scaling Transformers for Domain Specific Embeddings" (NeurIPS 2023)
`,
    expectedSections: ["personal", "summary", "experience", "education", "skills", "publications"]
  },

  // 5. Europass TR
  {
    id: "cv_05_europass_tr",
    name: "Europass Şablonu (TR)",
    layoutType: "europass",
    language: "tr",
    rawText: `EUROPASS ÖZGEÇMİŞ
KİŞİSEL BİLGİLER
Adı Soyadı: Mehmet Demir
E-posta: mehmet.demir@email.com
Telefon: +90 544 333 2211
Adres: Ankara, Türkiye

İŞ DENEYİMİ
Sistem Yöneticisi
Devlet Malzeme Ofisi (01/2020 - Halen)
- Linux ve Windows sunucu altyapılarının bakımı ve yönetimi.
- Cyber Security ve firewall kurallarının yapılandırılması.

EĞİTİM VE ÖĞRETİM
Lisans - Bilgisayar Teknolojisi ve Bilişim Sistemleri
Baskent Üniversitesi (09/2015 - 06/2019)

KİŞİSEL BECERİLER
Ana Dil: Türkçe
Diğer Diller: İngilizce (B2), Fransızca (A2)

DİJİTAL BECERİLER
Linux Administration | Bash Scripting | Cisco Networking | Docker | VMware
`,
    expectedSections: ["personal", "experience", "education", "languages", "skills"]
  },

  // 6. Europass EN
  {
    id: "cv_06_europass_en",
    name: "Europass CV Template (EN)",
    layoutType: "europass",
    language: "en",
    rawText: `EUROPASS CURRICULUM VITAE

PERSONAL INFORMATION
Name: Sarah Connor
Email: sarah.connor@email.com
Phone: +44 20 7946 0912
Address: London, United Kingdom

WORK EXPERIENCE
Cyber Security Specialist
Global Defense Systems (02/2021 - Present)
- Conducted penetration testing and vulnerability assessments.
- Implemented ISO 27001 compliance standards.

EDUCATION AND TRAINING
Bachelor of Engineering in Cybersecurity
University of Oxford (09/2016 - 06/2020)

PERSONAL SKILLS
Mother tongue: English
Other languages: German (C1), Spanish (B1)

DIGITAL SKILLS
Wireshark | Metasploit | Python Security Scripts | SIEM | OWASP Top 10
`,
    expectedSections: ["personal", "experience", "education", "languages", "skills"]
  },

  // 7. LinkedIn Export TR
  {
    id: "cv_07_linkedin_tr",
    name: "LinkedIn PDF Dışa Aktarımı (TR)",
    layoutType: "linkedin_export",
    language: "tr",
    rawText: `Ali Rıza Yılmaz
Backend Developer | Go & Distributed Systems
İzmir, Türkiye

Özet
5+ yıldır ölçeklenebilir mikroservisler ve distributed sistemler üzerine çalışan tutkulu bir yazılımcı.

Deneyim
Trendyol Group
Senior Backend Engineer
Ocak 2022 - Halen (2 yıl 7 ay)
- Go ile yüksek trafikli mikroservis mimarisi tasarlanması.
- Kafka mesajlaşma kuyruklarının optimize edilmesi.

Hepsiburada
Software Engineer
Mayıs 2019 - Aralık 2021 (2 yıl 8 ay)
- Java Spring Boot ile e-ticaret ödeme sistemi entegrasyonu.

Eğitim
Ege Üniversitesi
Bilgisayar Mühendisliği (2014 - 2019)

Yetenekler
Go (Golang) • Java • Kafka • Redis • Docker • Kubernetes • PostgreSQL
`,
    expectedSections: ["personal", "summary", "experience", "education", "skills"]
  },

  // 8. LinkedIn Export EN
  {
    id: "cv_08_linkedin_en",
    name: "LinkedIn PDF Export (EN)",
    layoutType: "linkedin_export",
    language: "en",
    rawText: `Emily Watson
Product Designer (UI/UX)
Seattle, Washington, United States

Summary
Human-centered product designer specializing in SaaS applications, design systems, and user research.

Experience
Microsoft
Senior Product Designer
January 2022 - Present (2 years 6 months)
- Designed end-to-end design systems for enterprise Cloud services.

Amazon
UX Designer
June 2019 - December 2021 (2 years 7 months)
- Conducted usability testing and wireframing for e-commerce checkouts.

Education
University of Washington
Bachelor of Arts in Human-Centered Design (2015 - 2019)

Skills
Figma • User Research • Wireframing • Prototyping • Design Systems • HTML/CSS
`,
    expectedSections: ["personal", "summary", "experience", "education", "skills"]
  },

  // 9. Scrambled / Non-Standard TR
  {
    id: "cv_09_scrambled_tr",
    name: "Karmaşık ve Başlıksız Bölümlü CV (TR)",
    layoutType: "scrambled_custom",
    language: "tr",
    rawText: `Caner Erkin
caner.erkin@email.com | 0505 123 45 67

PROJELER VE UYGULAMALAR
- Akıllı Şehir Trafik Yönetim Sistemi (IoT & Node.js)
- E-Ticaret Ödeme Entegrasyonu Servisi

EĞİTİM GEÇMİŞİ
Marmara Üniversitesi - İletişim Fakültesi (2016 - 2020)

İŞ TECRÜBELERİ
Yazılım Uzmanı - SoftCorp (2020 - 2023)
- RESTful API geliştirildi.

REFERANSLAR
- Prof. Dr. Mustafa Yılmaz - Marmara Ün. (myilmaz@marmara.edu.tr)
- Engin Altan - SoftCorp CTO (engin@softcorp.com)
`,
    expectedSections: ["personal", "projects", "education", "experience", "references"]
  },

  // 10. Misspelled / Non-standard TR
  {
    id: "cv_10_misspelled_tr",
    name: "Yazım Hatalı / Farklı Başlıklı CV (TR)",
    layoutType: "misspelled_nonstandard",
    language: "tr",
    rawText: `Merve Şahin
merve.sahin@email.com | 0533 111 22 44

HAKKIMDA & ÖZET
Frontend ve mobil uygulama geliştirme tutkunu bilgisayar mühendisi.

AKADEMİK GEÇMİŞ
Gazi Üniversitesi Bilgisayar Mühendisliği 2017-2021

İŞ DENEYİMLERİ VE STAJLAR
Yazılım Geliştirici Stajyeri - Turkcell (Haziran 2020 - Ağustos 2020)
- Flutter projesinde arayüz kodlaması yapıldı.

Sertifikalar ve Başarılar
- Turkcell Geleceği Yazanlar Flutter Başarı Sertifikası (2021)
- Kotlin BootCamp Tamamlama Belgesi (2022)

TEKNİK BECERİLER
Flutter, Dart, React Native, JavaScript, Firebase, Git
`,
    expectedSections: ["personal", "summary", "education", "experience", "certifications", "skills"]
  },

  // 11. Minimal Single Section CV
  {
    id: "cv_11_minimal_tr",
    name: "Kısa ve Yalın CV (TR)",
    layoutType: "standard_word",
    language: "tr",
    rawText: `Gözde Arslan
gozde.arslan@email.com
0542 000 11 22

DENEYİM
Stajyer Grafik Tasarımcı - Ajans X (2023 - 2024)
- Sosyal medya görselleri ve afiş tasarımları hazırlandı.

EĞİTİM
Mimar Sinan Güzel Sanatlar Üniversitesi - Grafik Tasarım (2019 - 2023)

BİLGİSAYAR BİLGİSİ
Photoshop, Illustrator, InDesign, Figma
`,
    expectedSections: ["personal", "experience", "education", "skills"]
  },

  // 12. Heavy Project Focus CV (EN)
  {
    id: "cv_12_projects_en",
    name: "Project Heavy CV (EN)",
    layoutType: "scrambled_custom",
    language: "en",
    rawText: `David Miller
david.miller@email.com | github.com/dmiller

CAREER OBJECTIVE
Full-stack software developer aiming to contribute to open-source distributed database projects.

KEY PROJECTS
Distributed KV Store (Go, Raft Consensus Protocol)
- Implemented leader election and log replication with 99.9% fault tolerance test suite.
Open-Source Graph Database (Rust)
- Built high-performance memory-mapped index structure.

WORK EXPERIENCE
Software Developer - DataTech (2022 - Present)
- Maintained internal caching microservices.

EDUCATION
B.S. Computer Engineering - MIT (2018 - 2022)

TECHNICAL PROFICIENCIES
Golang, Rust, C++, Distributed Systems, Linux Kernel
`,
    expectedSections: ["personal", "summary", "projects", "experience", "education", "skills"]
  },

  // 13. Academic CV TR (Publications & Grants)
  {
    id: "cv_13_academic_tr",
    name: "Akademik Özgeçmiş (TR)",
    layoutType: "standard_word",
    language: "tr",
    rawText: `Doç. Dr. Selin Aksoy
selin.aksoy@üniversite.edu.tr | Ankara

ÖĞRENİM BİLGİLERİ
Doktora - ODTÜ Elektrik-Elektronik Mühendisliği (2012 - 2017)
Yüksek Lisans - ODTÜ Elektrik-Elektronik Mühendisliği (2010 - 2012)
Lisans - ODTÜ Elektrik-Elektronik Mühendisliği (2006 - 2010)

AKADEMİK GÖREVLER
Doçent Doktor - ODTÜ (2022 - Halen)
Dr. Öğr. Üyesi - ODTÜ (2017 - 2022)

YAYINLAR VE BİLDİRİLER
- Aksoy, S., et al. "Signal Processing in Radar Systems", IEEE Transactions (2021).
- Aksoy, S. "Deep Learning for Target Tracking", Neural Networks Journal (2019).

BURS VE ÖDÜLLER
- TÜBİTAK 2219 Yurt Dışı Doktora Sonrası Araştırma Bursu (2018)
`,
    expectedSections: ["personal", "education", "experience", "publications", "certifications"]
  },

  // 14. Academic CV EN
  {
    id: "cv_14_academic_en",
    name: "Academic CV (EN)",
    layoutType: "standard_word",
    language: "en",
    rawText: `Dr. Robert Chen
robert.chen@university.edu | Boston, MA

EDUCATION
Ph.D. in Molecular Biology - Harvard University (2015 - 2020)
B.S. in Biochemistry - Yale University (2011 - 2015)

ACADEMIC APPOINTMENTS
Postdoctoral Research Fellow - Broad Institute (2020 - Present)

PUBLICATIONS
- Chen, R. et al. "CRISPR-Cas9 Off-target Minimization", Nature Biotechnology (2022).
- Chen, R. & Smith, A. "Genomic Editing in Mammalian Cells", Cell (2020).

GRANTS AND HONORS
- NIH Postdoctoral Fellowship Grant (2021)
`,
    expectedSections: ["personal", "education", "experience", "publications", "certifications"]
  },

  // 15. Turkish Europass Alternative
  {
    id: "cv_15_europass_alt_tr",
    name: "Alternatif Europass CV (TR)",
    layoutType: "europass",
    language: "tr",
    rawText: `KİŞİSEL BİLGİLER
Hakan Bulut
E-posta: hakan.bulut@email.com
Telefon: 0535 777 66 55

İŞ DENEYİMLERİ
İnsan Kaynakları Uzmanı
HR Danışmanlık A.Ş. (2019 - 2023)
- İşe alım mülakatları ve bordrolama süreçlerinin takibi.

EĞİTİM VE ÖĞRETİM
Lisans - Psikoloji Bölümü
Hacettepe Üniversitesi (2014 - 2019)

YABANCI DİLLER
İngilizce - C2 İleri Düzey

YETENEK VE YETKİNLİKLER
Performans Yönetimi, İş Hukuku, SAP HR, Mülakat Teknikleri
`,
    expectedSections: ["personal", "experience", "education", "languages", "skills"]
  },

  // 16. Complex Multi-Section Canva (TR)
  {
    id: "cv_16_canva_complex_tr",
    name: "Karmaşık Çok Bölümlü Canva (TR)",
    layoutType: "canva_multicolumn",
    language: "tr",
    rawText: `Büşra Çelik | UX Researcher | busra@uxlabs.io | +90 530 444 33 22

PROFİL
Kullanıcı deneyimi araştırmacısı ve kullanılabilirlik testi uzmanı.

ÇALIŞMA GEÇMİŞİ
UX Researcher - UX Studio (2022 - Halen)
- 50+ derinlemesine kullanıcı mülakatı gerçekleştirildi.

ÖĞRENİM
Sosyoloji Lisans - Galatasaray Üniversitesi (2016 - 2020)

UZMANLIK ALANLARI
Usability Testing, User Interviews, Persona Creation, Figma, Maze

SERTİFİKALAR
- UXQB Certified Professional for User Experience (CPUX-F) (2022)

DİLLER
Türkçe (Ana Dil)
Fransızca (C1)
İngilizce (C1)
`,
    expectedSections: ["personal", "summary", "experience", "education", "skills", "certifications", "languages"]
  },

  // 17. Multilingual Mixed Resume
  {
    id: "cv_17_mixed_lang",
    name: "Karma Dilli CV (TR/EN)",
    layoutType: "scrambled_custom",
    language: "tr",
    rawText: `Burak Yıldız
burak.yildiz@tech.com | Istanbul

SUMMARY
Senior Software Architect with passion for cloud-native infrastructure.

İŞ DENEYİMİ (WORK EXPERIENCE)
Cloud Architect - CloudCo (2021 - Present)
- AWS EKS and Terraform deployment.

EĞİTİM (EDUCATION)
Yıldız Teknik Üniversitesi - Bilgisayar Mühendisliği (2015 - 2019)

SKILLS & COMPETENCIES
Kubernetes, Docker, Terraform, AWS, Go, Python

CERTIFICATES
AWS Certified Solutions Architect Professional
`,
    expectedSections: ["personal", "summary", "experience", "education", "skills", "certifications"]
  },

  // 18. Executive CV (EN)
  {
    id: "cv_18_executive_en",
    name: "Executive Leadership CV (EN)",
    layoutType: "standard_word",
    language: "en",
    rawText: `Michael Vance
michael.vance@executive.com | Dallas, TX | linkedin.com/in/mvance

EXECUTIVE SUMMARY
Strategic Chief Technology Officer (CTO) with 15+ years driving digital transformation and scaling engineering teams from 10 to 200+.

PROFESSIONAL EXPERIENCE
Chief Technology Officer - Global Retail Corp (2019 - Present)
- Oversee $50M technology budget and 180 engineers.
- Transformed e-commerce platform architecture driving 300% YoY growth.

VP of Engineering - SaaS Tech Inc (2013 - 2019)
- Built cloud platform serving 10M active monthly users.

EDUCATION
MBA - Wharton School, University of Pennsylvania (2011 - 2013)
B.S. Computer Science - UT Austin (2003 - 2007)

BOARD POSITIONS & REFERENCES
- Board Advisor at Tech Accelerator
- References available upon request
`,
    expectedSections: ["personal", "summary", "experience", "education", "references"]
  },

  // 19. Misspelled Headings TR 2
  {
    id: "cv_19_misspelled_tr_2",
    name: "Yazım Hatalı Başlıklar CV 2 (TR)",
    layoutType: "misspelled_nonstandard",
    language: "tr",
    rawText: `Emin Öztürk
emin.ozturk@gmail.com | 0536 999 11 22

EGITIM BILGILERI
Anadolu Üniversitesi - İşletme (2017 - 2021)

IS TECRUBELERI
Satış Danışmanı - Perakende A.Ş. (2021 - 2023)
- Müşteri ilişkileri yönetildi ve aylık satış kotaları aşıldı.

YETENEKLER VE BECERILER
Müşteri İlişkileri, MS Office, İkna Kabiliyeti, CRM

YABANCI DIL
İngilizce (Orta Düzey)
`,
    expectedSections: ["personal", "education", "experience", "skills", "languages"]
  },

  // 20. Condensed One-Page Resume
  {
    id: "cv_20_condensed_en",
    name: "Condensed One-Page Resume (EN)",
    layoutType: "standard_word",
    language: "en",
    rawText: `Laura Green
laura.green@email.com | Austin, TX

EXPERIENCE
Frontend Developer - WebAgency (2022 - Present): Built Vue.js applications.
Web Developer Intern - StartUp (2021 - 2022): Maintained HTML/CSS layouts.

EDUCATION
B.A. Graphic Design - Texas State University (2017 - 2021)

SKILLS
HTML5, CSS3, JavaScript, Vue.js, Tailwind CSS
`,
    expectedSections: ["personal", "experience", "education", "skills"]
  },

  // 21. Student / Intern Resume TR
  {
    id: "cv_21_student_tr",
    name: "Öğrenci / Yeni Mezun CV (TR)",
    layoutType: "standard_word",
    language: "tr",
    rawText: `Selin Avcı
selin.avci@ogrenci.edu.tr | Ankara

ÖZET
Yazılım mühendisliği son sınıf öğrencisi. Yapay zeka ve makine öğrenmesi alanlarında kendimi geliştiriyorum.

EĞİTİM
Hacettepe Üniversitesi - Yazılım Mühendisliği (2021 - 2025)

STAJ DENEYİMİ
Yapay Zeka Stajyeri - TÜBİTAK SAGE (Temmuz 2024 - Ağustos 2024)
- Görüntü işleme modelleri eğitildi.

PROJELER
- Derin Öğrenme ile Nesne Tespiti Projesi (Python, PyTorch)

YETENEKLER
Python, C++, PyTorch, OpenCV, Git
`,
    expectedSections: ["personal", "summary", "education", "experience", "projects", "skills"]
  },

  // 22. Freelance / Consultant Resume EN
  {
    id: "cv_22_freelance_en",
    name: "Freelance Consultant Resume (EN)",
    layoutType: "scrambled_custom",
    language: "en",
    rawText: `Oliver Queen
oliver@greenconsulting.io | London, UK

SUMMARY
Independent DevOps & Cloud Consultant specializing in AWS infrastructure automation.

CONSULTING PROJECTS & ENGAGEMENTS
DevOps Consultant - FinTech Ltd (2023 - 2024)
- Automated Kubernetes deployment pipelines with ArgoCD.
Cloud Architect - E-Com Global (2022 - 2023)
- Migrated 50+ servers to AWS EC2 and RDS.

EDUCATION
B.Sc. Software Engineering - Imperial College London (2015 - 2018)

TECHNICAL SKILLS
AWS, Terraform, Kubernetes, Docker, CI/CD, Ansible, Python
`,
    expectedSections: ["personal", "summary", "experience", "education", "skills"]
  },

  // 23. Turkish Resume with References and Certs
  {
    id: "cv_23_full_tr",
    name: "Tam Detaylı Türkçe CV (TR)",
    layoutType: "standard_word",
    language: "tr",
    rawText: `Mustafa Kalkan
mustafa.kalkan@email.com | +90 532 100 20 30 | Bursa, Türkiye

ÖZET BİLGİ
10+ yıllık deneyime sahip Kıdemli Kalite Güvence (QA) Otomasyon Mühendisi.

İŞ DENEYİMİ
Senior QA Automation Engineer - Otomotiv Sanayi A.Ş. (2020 - Halen)
- Selenium ve Appium ile uçtan uca otomasyon test suiti kuruldu.

QA Test Mühendisi - Yazılım Evrensel (2015 - 2020)
- Manuel ve otomasyon testleri yürütüldü.

EĞİTİM BİLGİLERİ
Uludağ Üniversitesi - Makine Mühendisliği (2010 - 2015)

SERTİFİKALAR
- ISTQB Certified Tester Advanced Level (2021)
- Selenium Automation Specialist (2018)

YETENEKLER
Java, Selenium, Appium, Cucumber, Jenkins, JIRA, Postman, SQL

REFERANSLAR
- Kemal Yılmaz - QA Müdürü (kemal@otomotiv.com)
`,
    expectedSections: ["personal", "summary", "experience", "education", "certifications", "skills", "references"]
  },

  // 24. Highly Scrambled Formatting Resume
  {
    id: "cv_24_scrambled_2",
    name: "Düzensiz Satır Yapılı CV",
    layoutType: "scrambled_custom",
    language: "tr",
    rawText: `Deniz Yılmaz - deniz@yilmaz.com - 0532 555 44 33
KİŞİSEL BİLGİLER
Yaş: 28 | Askerlik: Yapıldı

EĞİTİM HAYATIM
Eskişehir Osmangazi Üniversitesi - Maden Mühendisliği (2014-2018)

ÇALIŞMA GEÇMİŞİ VE TECRÜBELER
Saha Mühendisi - Madencilik A.Ş. (2019-2022)
- Saha operasyonları yönetildi.

YETENEKLER / BECERİLER
AutoCAD, Vulcan, Excel, Ehliyet B
`,
    expectedSections: ["personal", "education", "experience", "skills"]
  },

  // 25. English Resume with Misspelled Headings
  {
    id: "cv_25_misspelled_en",
    name: "Misspelled English CV",
    layoutType: "misspelled_nonstandard",
    language: "en",
    rawText: `Karen Taylor
karen.taylor@email.com | Seattle, WA

PROFESIONAL SUMMARY
Experienced Marketing Specialist focused on Digital Ads and Content Strategy.

WORK HISTORIES
Digital Marketing Manager - Media Agency (2021 - Present)
- Managed $1M annual Google Ads and Meta Ads budget.

EDUCATIONAL BACKGROUND
B.A. Communication & Marketing - Washington State Univ (2016 - 2020)

CORE COMPETENCIES & SKILLS
SEO, Google Analytics, Content Marketing, Copywriting, Social Media Strategy
`,
    expectedSections: ["personal", "summary", "experience", "education", "skills"]
  }
];
