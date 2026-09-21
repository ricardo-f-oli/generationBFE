import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MIN_PASSWORD_LENGTH, PasswordMeter } from './PasswordMeter';

/**
 * The rule this file exists to protect: the state is readable without seeing the colour.
 *
 * Red and green are the fastest signal for most people and no signal at all for some, so the
 * count and the worded status are what is asserted here. A refactor that reduced this to a
 * coloured bar would still look right in a screenshot and would be a regression.
 */
describe('PasswordMeter', () => {
  it('says nothing before anything is typed', () => {
    const { container } = render(<PasswordMeter value="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('counts down the characters still needed', () => {
    render(<PasswordMeter value="short" />);
    expect(screen.getByText(/5 of 12 characters — 7 more/i)).toBeInTheDocument();
  });

  it('reports the requirement met at exactly the minimum', () => {
    render(<PasswordMeter value={'a'.repeat(MIN_PASSWORD_LENGTH)} />);
    expect(screen.getByText(/12 characters — long enough/i)).toBeInTheDocument();
  });

  it('does not exceed 100% for a long passphrase', () => {
    render(<PasswordMeter value={'a'.repeat(40)} />);
    // aria-valuenow is clamped to the minimum, so assistive tech is not told "40 of 12".
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12');
  });
});
