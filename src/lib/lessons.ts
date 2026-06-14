import type { Lesson } from '../types';

/**
 * The ordered catalog of Spanish lessons and their exercises.
 */
export const lessonsData: Lesson[] = [
  {
    id: 1,
    title: "¡Hola, Pingüino!",
    subtitle: "Greetings & Coffee",
    description: "Learn basic greetings and essential morning fuel words like café and pancakes!",
    xpReward: 20,
    icon: "👋",
    exercises: [
      {
        id: "l1-q1",
        type: "multiple-choice",
        instruction: "Select the correct Spanish translation of this basic greeting:",
        questionText: "Hello! How are you?",
        options: [
          "¡Hola! ¿Cómo estás?",
          "¡Adiós! Hasta luego.",
          "Yo escribo código."
        ],
        correctAnswer: "¡Hola! ¿Cómo estás?"
      },
      {
        id: "l1-q2",
        type: "matching",
        instruction: "Match the Spanish greetings and morning essentials with their English translations:",
        questionText: "Match the pairs",
        leftPairs: ["hola", "gracias", "café", "panqueques", "buenos días"],
        rightPairs: ["thanks", "pancakes", "good morning", "coffee", "hello"],
        matchingMap: {
          "hola": "hello",
          "gracias": "thanks",
          "café": "coffee",
          "panqueques": "pancakes",
          "buenos días": "good morning"
        }
      },
      {
        id: "l1-q3",
        type: "fill-blank",
        instruction: "Select the missing word to complete this morning phrase:",
        questionText: "Yo quiero un _______ con leche, por favor.",
        options: ["código", "café", "servidor"],
        correctAnswer: "café"
      },
      {
        id: "l1-q4",
        type: "word-bank",
        instruction: "Translate this sentence to Spanish by tapping the word pills:",
        questionText: "I like coffee with pancakes.",
        englishPhrase: "Me gusta el café con panqueques.",
        wordBank: ["Me", "gusta", "el", "café", "con", "panqueques", "servidor", "leche"],
        correctWordOrder: ["Me", "gusta", "el", "café", "con", "panqueques."]
      }
    ]
  },
  {
    id: 2,
    title: "El Desayuno Tech",
    subtitle: "Pancake Stacks & Servers",
    description: "Bridge the gap between your physical breakfast stack and your digital server stack!",
    xpReward: 25,
    icon: "🥞",
    exercises: [
      {
        id: "l2-q1",
        type: "multiple-choice",
        instruction: "Select the correct Spanish translation for this server status statement:",
        questionText: "The server is running very well.",
        options: [
          "La computadora está rota.",
          "El servidor está funcionando muy bien.",
          "El panqueque es delicioso."
        ],
        correctAnswer: "El servidor está funcionando muy bien."
      },
      {
        id: "l2-q2",
        type: "matching",
        instruction: "Match these architectural and culinary components:",
        questionText: "Match the pairs",
        leftPairs: ["servidor", "código", "desayuno", "antigravedad", "leche"],
        rightPairs: ["code", "antigravity", "server", "milk", "breakfast"],
        matchingMap: {
          "servidor": "server",
          "código": "code",
          "desayuno": "breakfast",
          "antigravedad": "antigravity",
          "leche": "milk"
        }
      },
      {
        id: "l2-q3",
        type: "fill-blank",
        instruction: "Complete the sentence with the correct Spanish word:",
        questionText: "El programador escribe _______ por la mañana.",
        options: ["antigravedad", "código", "leche"],
        correctAnswer: "código"
      },
      {
        id: "l2-q4",
        type: "word-bank",
        instruction: "Translate this tech-breakfast sentence to Spanish by tapping the word pills:",
        questionText: "The server needs more pancakes.",
        englishPhrase: "El servidor necesita más panqueques.",
        wordBank: ["El", "servidor", "necesita", "más", "panqueques", "código", "nube", "leche"],
        correctWordOrder: ["El", "servidor", "necesita", "más", "panqueques."]
      }
    ]
  },
  {
    id: 3,
    title: "La Terminal",
    subtitle: "Linux & Shell Commands",
    description: "Learn Linux, consoles, directories, and how to command your operating system in Spanish!",
    xpReward: 30,
    icon: "💻",
    exercises: [
      {
        id: "l3-q1",
        type: "multiple-choice",
        instruction: "Select the correct Spanish translation of this system declaration:",
        questionText: "I use Linux on my computer every day.",
        options: [
          "Yo uso Linux en mi computadora todos los días.",
          "Me encanta comer panqueques en mi escritorio.",
          "Mi computadora no tiene una consola."
        ],
        correctAnswer: "Yo uso Linux en mi computadora todos los días."
      },
      {
        id: "l3-q2",
        type: "matching",
        instruction: "Match these terminal and system commands:",
        questionText: "Match the pairs",
        leftPairs: ["consola", "carpeta", "nube", "computadora", "desarrollo"],
        rightPairs: ["folder", "development", "computer", "terminal", "cloud"],
        matchingMap: {
          "consola": "terminal",
          "carpeta": "folder",
          "nube": "cloud",
          "computadora": "computer",
          "desarrollo": "development"
        }
      },
      {
        id: "l3-q3",
        type: "fill-blank",
        instruction: "Complete this terminal description in Spanish:",
        questionText: "Abro la _______ para ejecutar un script de Bash.",
        options: ["leche", "carpeta", "consola"],
        correctAnswer: "consola"
      },
      {
        id: "l3-q4",
        type: "word-bank",
        instruction: "Translate this phrase to Spanish by tapping the word pills:",
        questionText: "This folder contains my React code.",
        englishPhrase: "Esta carpeta contiene mi código de React.",
        wordBank: ["Esta", "carpeta", "contiene", "mi", "código", "de", "React", "consola", "nube"],
        correctWordOrder: ["Esta", "carpeta", "contiene", "mi", "código", "de", "React."]
      }
    ]
  },
  {
    id: 4,
    title: "La Nube y el Despliegue",
    subtitle: "Cloud Stacks & Deployments",
    description: "Master vocabulary around deploying containers, GCP network security, and cloud architectures.",
    xpReward: 35,
    icon: "☁️",
    exercises: [
      {
        id: "l4-q1",
        type: "multiple-choice",
        instruction: "Select the correct Spanish translation for this deployment action:",
        questionText: "We are going to deploy the application today.",
        options: [
          "Vamos a desplegar la aplicación hoy.",
          "Vamos a borrar el repositorio hoy.",
          "Estamos desayunando con el pingüino."
        ],
        correctAnswer: "Vamos a desplegar la aplicación hoy."
      },
      {
        id: "l4-q2",
        type: "matching",
        instruction: "Match the cloud-architecture terms:",
        questionText: "Match the pairs",
        leftPairs: ["desplegar", "seguridad", "red", "automatizar", "proyecto"],
        rightPairs: ["network", "project", "security", "deploy", "automate"],
        matchingMap: {
          "desplegar": "deploy",
          "seguridad": "security",
          "red": "network",
          "automatizar": "automate",
          "proyecto": "project"
        }
      },
      {
        id: "l4-q3",
        type: "fill-blank",
        instruction: "Fill in the correct deployment target:",
        questionText: "El código de Kubernetes se ejecuta en la _______.",
        options: ["red", "nube", "taza"],
        correctAnswer: "nube"
      },
      {
        id: "l4-q4",
        type: "word-bank",
        instruction: "Translate this cloud pipeline command to Spanish by tapping the word pills:",
        questionText: "The script automates the network security.",
        englishPhrase: "El script automatiza la seguridad de la red.",
        wordBank: ["El", "script", "automatiza", "la", "seguridad", "de", "la", "red", "nube"],
        correctWordOrder: ["El", "script", "automatiza", "la", "seguridad", "de", "la", "red."]
      }
    ]
  },
  {
    id: 5,
    title: "Pingüino Conversacional",
    subtitle: "Habla con el Pingüino",
    description: "Bring it all together! Chat about coding, pancake recipes, and GCP architectures in fluent Spanish.",
    xpReward: 40,
    icon: "🐧",
    exercises: [
      {
        id: "l5-q1",
        type: "multiple-choice",
        instruction: "Select the correct Spanish translation of this encouraging feedback statement:",
        questionText: "Excellent work! You are programming in Spanish.",
        options: [
          "¡Excelente trabajo! Estás programando en español.",
          "¡Sintaxis incorrecta! Rescribe tu código.",
          "Me encanta comer panqueques de arándanos."
        ],
        correctAnswer: "¡Excelente trabajo! Estás programando en español."
      },
      {
        id: "l5-q2",
        type: "matching",
        instruction: "Match these conversational practice helpers:",
        questionText: "Match the pairs",
        leftPairs: ["aprender", "hablar", "mejorar", "herramienta", "amigo"],
        rightPairs: ["to speak", "friend", "to learn", "tool", "to improve"],
        matchingMap: {
          "aprender": "to learn",
          "hablar": "to speak",
          "mejorar": "to improve",
          "herramienta": "tool",
          "amigo": "friend"
        }
      },
      {
        id: "l5-q3",
        type: "fill-blank",
        instruction: "Select the word that represents your learning goal:",
        questionText: "Quiero _______ español para hablar con mi tutor.",
        options: ["desplegar", "aprender", "automatizar"],
        correctAnswer: "aprender"
      },
      {
        id: "l5-q4",
        type: "word-bank",
        instruction: "Translate this conversational sentence to Spanish by tapping the word pills:",
        questionText: "I speak Spanish with my software tutor.",
        englishPhrase: "Yo hablo español con mi tutor de software.",
        wordBank: ["Yo", "hablo", "español", "con", "mi", "tutor", "de", "software", "carpeta"],
        correctWordOrder: ["Yo", "hablo", "español", "con", "mi", "tutor", "de", "software."]
      }
    ]
  }
];
