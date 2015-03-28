var appQuestions = [{
    "id": 0,
    "question": "I have a nosebleed, what should I do?",
    "answers": [{
        "answer": "Your genetics and lab biomarkers show no coagulation problems. Since you are an adult, you can try to treat it.  Sit down, lean forward, gently squeeze the soft portion of the nose between your thumb and finger for 10 minutes. If bleeding does not stop after 20 minutes, please get emergency care. The closest open clinic at this hour is Minute Clinic on 3rd avenue, staffed by Dr. Ray Gun. Their phone number is <a href=\"tel:(212) 342-5674\">(212) 342-5674<\/a>. They take your Aetna insurance, or you can pay directly $89 for a visit.",
        "confidence": 90
    }, {
        "answer": "Most cases may be successfully treated by direct pressure on the bleeding site for 15 minutes. When this is inadequate, topical sympathomimetics and various nasal tamponade methods are usually effective. Posterior, bilateral, or large volume epistaxis should be triaged immediately to a specialist in a critical care setting.",
        "confidence": 75
    }, {
        "answer": "Short-acting topical nasal decongestants (eg, phenylephrine, 0.125 - 1% solution, one or two sprays), which act as vasoconstrictors, may also be helpful. When the bleeding does not readily subside, the nose should be examined, using good illumination and suction, in an attempt to locate the bleeding site.",
        "confidence": 63
    }],
    "dataSources": [0, 2, 4, 5, 6]
}, {
    "id": 1,
    "question": "What should I do for my exercise plan today?",
    "answers": [{
        "answer": "Your genetic diet\/fitness plan suggests you burn approximately 1,000 more calories today, as you currently have burned 2,110. As it is getting late, a 30 minute run in Runyon Canyon Park, which is a 5 minute walk from your current position, would be optimal. Make sure you take one 200mg ibuprofen such as Advil or Motrin, and you can also have one cup of coffee (you are a slow caffeine metabolizer). Activate your Fitbit Flex or Apple Watch to track your exercise.",
        "confidence": 92
    }, {
        "answer": "No matter your age or fitness level, these activities can help you get in shape and lower your risk for disease: Swimming, Tai chi, Strength training, Walking, and Kegel exercises. Remember, raking the yard counts as physical activity, and so does ballroom dancing and playing with your kids or grandkids.",
        "confidence": 76
    }, {
        "answer": "Staying physically active is important to prevent heart disease and stroke. To improve overall cardiovascular health, exercising thirty minutes a day, five times a week is an easy goal to remember. You will also experience benefits even if you divide your time into two or three segments of 10 to 15 minutes per day.",
        "confidence": 51
    }],
    "dataSources": [0, 1, 2, 4, 5, 7]
}, {
    "id": 2,
    "question": "I need angioplasty for my heart. Should I take clopidogrel?",
    "answers": [{
        "answer": "Based on your genetics, you metabolize clopidogrel poorly; therefore it is not recommended for you. Do not change or modify your prescription drug usage without talking to your doctor first. Do you want me to contact your physician? <a href=\"tel:(212) 342-5674\">(212) 342-5674<\/a>",
        "confidence": 88
    }, {
        "answer": "If you require percutaneous coronary intervention, you are more likely to experience stent thrombosis if treated with clopidogrel. Your genotype is consistent with a defective CYP2C19 enzyme which has been correlated with low plasma concentrations of the active metabolite of clopidogrel. Many other factors may contribute to the variability in antiplatelet effect seen with clopidogrel besides CYP2C19 genetic polymorphisms.",
        "confidence": 65
    }, {
        "answer": "Your insurance carrier (United) covers plavix\/clopidogrel prescriptions.  Clopidogrel is a prescription blood thinner used to help prevent stroke, heart attack, and other heart problems.",
        "confidence": 52
    }],
    "dataSources": [0, 4, 5, 6]
}, {
    "id": 3,
    "question": "What should I eat for the rest of the day?",
    "answers": [{
        "answer": "Based on your diet plan, genetics, lab, BMI, and exercise data, you have 1,200 calories to consume of your 3,000 calorie diet. Your daily large caff\u00e8 latte (350 calories) is OK to enjoy. Chef Watson suggests an evening meal: one 7 oz piece of blackened codfish, 1 cup of kale\/lettuce\/mixed greens (dressing of your choice), 1 cup steamed wild rice, 5 asparagus shoots, 1 glass red wine, and 1\/2 cup H\u00e4agen-Dazs carmel crunch ice-cream.",
        "confidence": 91
    }, {
        "answer": "Your daily caloric intake calculator recommends a diet of 3,000 calories based on your age, gender, weight, height, and exercise levels.",
        "confidence": 78
    }, {
        "answer": "Harvard&apos;s Healthy Eating Plate recommends eating mostly vegetables, fruit, and whole grains, healthy fats, and healthy proteins. It also suggests drinking water instead of sugary beverages.",
        "confidence": 66
    }],
    "dataSources": [0, 1, 4, 5, 7]
}, {
    "id": 4,
    "question": "What is the mutation rate of lung squamous cell carcinoma (SqCC), and in which genes?",
    "answers": [{
        "answer": "Lung SqCC has an observed mutation rate of 8.1\/Mb. Almost all Lung SqCC have a somatic mutation of the TP53 gene, followed by those in the CDKN2A, NFE2L2, PI3K, SOX\/TP63\/NOTCH1, FGFR, PTEN, and HRAS gene pathways. EGFR and KRAS mutations are rare in SqCC. Your records have no mention of the TP53 gene. Do you want to consult a doctor regarding a genetic test?",
        "confidence": 96
    }, {
        "answer": "Small cell lung carcinoma usually has metastases at the time of discovery and accounts for about 110,000 cancer diagnoses annually. A deletion of part of chromosome 3 was first observed in 1982 in small cell lung carcinoma cell lines.",
        "confidence": 68
    }, {
        "answer": "Squamous cell carcinoma (20% of cases) arises from the bronchial epithelium, typically as a centrally located, intraluminal sessile or polypoid mass.",
        "confidence": 53
    }],
    "dataSources": [4, 5, 6]
                    }];

var appQuestionUpdate = 'Your genetic diet/fitness plan suggests you burn approximately <span class="answer-updated">500</span> more calories today, as you currently have burned <span class="answer-updated">2,610</span>. As it is getting late, a <span class="answer-updated">20</span> minute run in Runyon Canyon Park, which is a 5 minute walk from your current position, would be optimal. Make sure you take one 200mg ibuprofen such as Advil or Motrin, and you can also have one cup of coffee (you are a slow caffeine metabolizer).';