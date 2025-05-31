/**
 * BaseRoom (Basisklasse für alle Escape-Räume)
 *
 * Diese Klasse stellt die Grundstruktur für alle Räume im Spiel bereit.
 * Sie speichert die Szene und merkt sich automatisch alle Objekte, 
 * die hinzugefügt werden. So können Räume später mit `cleanup()` 
 * einfach entfernt werden – ideal für Szenenwechsel.
 *
 * Vorteile:
 * - Einheitliche Struktur für alle Räume
 * - Einfacher Szenenwechsel durch automatische Entfernung aller Objekte
 * - Klar getrennte Raumlogik (init, add, cleanup)
 *
 * So nutzt man die Klasse:
 * 1. Erstelle eine Klasse, die von BaseRoom erbt (z. B. `class Room1 extends BaseRoom`)
 * 2. Übergib die Szene im Konstruktor: `super(scene)`
 * 3. Definiere eine eigene `init()`-Methode für Licht, Möbel, Rätsel usw.
 * 4. Füge Objekte über `this.add(obj)` hinzu, um sie trackbar zu machen
 * 5. Optional: Überschreibe `onSolved()` → wird aufgerufen, wenn ein Raum gelöst wurde
 */

export class BaseRoom {
    constructor(scene) {
      this.scene = scene;
      this.objects = [];
    }
  
    /**
     * Wird von Kindklasse überschrieben. Baut den Raum auf.
     */
    init() {
      console.warn("⚠️ init() wurde nicht überschrieben.");
    }
  
    /**
     * Entfernt alle Objekte aus der Szene – für Szenenwechsel.
     */
    cleanup() {
      for (const obj of this.objects) {
        this.scene.remove(obj);
      }
      this.objects = [];
    }
  
    /**
     * Fügt ein Objekt der Szene hinzu und trackt es automatisch.
     * So wird es bei `cleanup()` auch entfernt.
     */
    add(object) {
      this.scene.add(object);
      this.objects.push(object);
    }
  
    /**
     * Wird aufgerufen, wenn ein Raum als "gelöst" gilt.
     * Z. B. Tür geöffnet, Rätsel erfolgreich, o. ä.
     * Kann von Kindklassen überschrieben werden.
     */
    onSolved() {
      console.log("✅ Raum gelöst. (Standardverhalten – bitte überschreiben)");
    }
  }
  