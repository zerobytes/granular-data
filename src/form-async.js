import { signal, formSchema } from '@granularjs/core';

export function asyncForm(schemaDef, { onSubmit, ...formOptions } = {}) {
  const form = formSchema(schemaDef, formOptions);
  const submitting = signal(false);
  const submitError = signal(null);
  const submitCount = signal(0);
  const lastResult = signal(undefined);

  const baseSubmit = form.submit.bind(form);

  function submit(handler) {
    const fn = handler || onSubmit;
    if (typeof fn !== 'function') {
      throw new Error('asyncForm.submit: provide onSubmit or pass a handler');
    }
    const submitHandler = baseSubmit(async (values) => {
      const res = await fn(values, form);
      return res;
    });
    return async (event) => {
      submitting.set(true);
      submitError.set(null);
      submitCount.set(submitCount.get() + 1);
      try {
        const result = await submitHandler(event);
        lastResult.set(result);
        submitting.set(false);
        return result;
      } catch (err) {
        submitError.set(err);
        submitting.set(false);
        throw err;
      }
    };
  }

  return Object.assign(form, {
    submit,
    submitting,
    submitError,
    submitCount,
    lastResult,
  });
}
