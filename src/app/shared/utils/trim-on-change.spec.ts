import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { trimOnChange } from './trim-on-change';

@Component({ selector: 'app-host', template: '' })
class Host {
  readonly control = new FormControl('');
  constructor() {
    trimOnChange(this.control);
  }
}

describe('trimOnChange', () => {
  it('strips surrounding whitespace as the value changes', () => {
    const { control } = TestBed.createComponent(Host).componentInstance;
    control.setValue('  ana@example.com \n');
    expect(control.value).toBe('ana@example.com');
  });

  it('leaves inner spaces and clean values alone', () => {
    const { control } = TestBed.createComponent(Host).componentInstance;
    control.setValue('Ana Pérez');
    expect(control.value).toBe('Ana Pérez');
  });
});
