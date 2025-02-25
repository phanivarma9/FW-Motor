import { Component } from '@angular/core';

@Component({
  selector: 'app-fw-motor',
  templateUrl: './fw-motor.component.html',
  styleUrls: ['./fw-motor.component.css']
})
export class FwMotorComponent {
  title = 'fw-motor';
  myPlanConfig = {
  title: true,
  subtitle: true,
  price: true,
  radioBtn:true,
  banner: true,
  selected: true,
  addOns:true,
  desc:true,
  customBtn:{visible:true, title:'Customize'},
  additionalBtn:{visible:true, title:'Add Coverages'}
  }
  plans:any = [
    {
      title1: 'Custom',
      title2:'Selection',
      description: 'Your coverage, your way, always.',
      price: 191334,
      coverage: 'Own damage policy cover till unlimited km',
      includes: ['Zero Depreciation (ZD)', 'Consumable Cover', 'Accident Cover for Passengers', 'SmartSaver Plus', 'Engine Protect', 'Tyre Protect'],
      recommended: false,
      selected: false,
      addonTitle:'Includes',
      identity: { bold: 'Custom Selection', regular: '' },
      addons: [
        { name: 'Roadside Assistance', tooltip: '24/7 breakdown assistance for car troubles, anytime, anywhere.' },
        { name: 'Windshield Protection', tooltip: '24/7 breakdown assistance for car troubles, anytime, anywhere.' }
      ]
    },
    {
      title1: 'Zero dep,',
      title2: 'zero worries',
      description: 'Maximum coverage without depreciation',
      price: 174334,
      coverage: 'Own damage policy cover till unlimited km',
      includes: ['Zero Depreciation (ZD)', 'Consumable Cover', 'Accident Cover for Passengers', 'SmartSaver Plus'],
      recommended: true,
      selected: true,
      addonTitle:'Everything in No frills, plus',
      identity: { bold: 'Zero dep,', regular: 'zero worries' },
      addons: [
        { name: 'Accident Recovery', tooltip:'24/7 breakdown assistance for car troubles, anytime, anywhere.' },
        { name: 'Extended Coverage', tooltip: '24/7 breakdown assistance for car troubles, anytime, anywhere.' }
      ]
    },
    {
      title1: 'Smart plan, ',
      title2:'better pricing',
      description: 'Fair pricing based on usage and protection needs',
      price: 187683,
      coverage: 'Own damage policy cover till unlimited km',
      includes: ['Loss of Personal Belongings', 'Key Protect', 'Return to Invoice', 'Emergency Medical Expenses'],
      recommended: false,
      selected: false,
      addonTitle:'Everything in Zero dep, plus',
      identity: { bold: 'Smart plan,', regular: 'better pricing' },
      addons: [
        { name: 'Smart Saver Plus', tooltip: '24/7 breakdown assistance for car troubles, anytime, anywhere.' },
        { name: 'Key Protection', tooltip: '24/7 breakdown assistance for car troubles, anytime, anywhere.' }
      ]
    }
  ]

  handleSelectionChange(isSelected: any): void {
    // Handle the change event here (e.g., update your model, trigger an action, etc.)
    console.log('Radio button selected:', isSelected);
  }

  customize(data: any): void {
    // Handle the change event here (e.g., update your model, trigger an action, etc.)
    console.log( data);
  }

  view(data: any): void {
    // Handle the change event here (e.g., update your model, trigger an action, etc.)
    console.log( data);
  }
}
