import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { FONT_OPTIONS, fontFamily } from '../../platform/theme-fonts.js';

export function FontSelect({ id, label, value, onChange, heading = false, bodyFont = 'inter' }) {
  const options = heading
    ? [{ id: 'inherit', label: 'Same as body font', family: fontFamily(bodyFont) }, ...FONT_OPTIONS]
    : FONT_OPTIONS;
  const selected = options.find(option => option.id === value) || options[0];

  return <Select.Root value={selected.id} onValueChange={onChange}>
    <Select.Trigger id={id} className="input cg-font-select-trigger" aria-label={label}>
      <Select.Value><span style={{ fontFamily: selected.family }}>{selected.label}</span></Select.Value>
      <Select.Icon asChild><ChevronDown size={15} aria-hidden="true" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="cg-font-select-menu" position="popper" sideOffset={6} collisionPadding={12} aria-label={label}>
        <Select.Viewport className="cg-font-select-viewport">
          {options.map(option => <Select.Item key={option.id} value={option.id} textValue={option.label}
            className="cg-font-select-option" style={{ fontFamily: option.family }}>
            <Select.ItemIndicator className="cg-font-select-check"><Check size={14} aria-hidden="true" /></Select.ItemIndicator>
            <Select.ItemText>{option.label}</Select.ItemText>
            <span className="cg-font-select-sample" aria-hidden="true">Aa</span>
          </Select.Item>)}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>;
}
