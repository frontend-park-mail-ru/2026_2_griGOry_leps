import { registerComponent } from '../../core/template.js';
import '../link/link.js';
import source from './form-note.hbs?raw';
import './form-note.css';

export const renderFormNote = registerComponent('form-note', source);
