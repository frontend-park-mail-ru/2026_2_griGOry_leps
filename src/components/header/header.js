import { registerComponent } from '../../core/template.js';
import '../logo/logo.js';
import source from './header.hbs?raw';
import './header.css';

export const renderHeader = registerComponent('header', source);
