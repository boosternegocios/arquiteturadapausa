import React from 'react'

export const EmotionalFatigue = ({ data, onChange }) => {
  const updateData = (section, field, value) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    })
  }

  // 01: Escala de Autenticidade
  const renderAct01 = () => {
    const scales = [
      { key: 'outros', label: 'Com os outros' },
      { key: 'consigo', label: 'Consigo mesmo(a)' }
    ]
    const scaleData = data?.act01 || {}

    return (
      <div className="mb-16 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm animate-in fade-in">
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">01. Confronte seu EU Inautêntico</h3>
        <p className="text-slate-500 font-medium mb-10">Em uma escala de 1 a 10, quão autêntico você se considera habitualmente?</p>
        
        <div className="space-y-10">
          {scales.map((s, index) => (
            <div key={s.key} className="bg-[#fcfaf5] border border-slate-100 p-6 md:p-8 rounded-3xl">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#eb6496] mb-6 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#eb6496]"></span>
                {s.label}
              </h4>
              <div className="flex justify-between md:justify-start gap-2 md:gap-4 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
                  const isSelected = scaleData[s.key] === val
                  let colorClass = 'border-slate-200 text-slate-500 hover:bg-white hover:border-[#eb6496]/50 bg-white shadow-sm'
                  
                  if (isSelected) {
                    if (val <= 4) colorClass = 'bg-[#004b4c] text-white border-[#004b4c] font-bold shadow-md'
                    else if (val <= 7) colorClass = 'bg-[#1ed7a4] text-slate-900 border-[#1ed7a4] font-black shadow-md'
                    else colorClass = 'bg-[#eb6496] text-white border-[#eb6496] font-black shadow-md'
                  }

                  return (
                    <button
                      key={val}
                      onClick={() => updateData('act01', s.key, val)}
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border-2 flex items-center justify-center text-base md:text-lg transition-all ${colorClass} ${isSelected ? 'scale-110 -translate-y-1' : ''}`}
                    >
                      {val}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 02: Uso de máscaras
  const renderAct02 = () => {
    const situations = [
      { key: 'social', label: 'Ao conviver com pessoas de outro nível social' },
      { key: 'educacional', label: 'Ao conviver com pessoas com maior nível educacional' },
      { key: 'interessantes', label: 'Ao conviver com pessoas que você considera mais interessantes' },
      { key: 'infeliz', label: 'Quando você está infeliz com seu estado mental ou emocional' }
    ]

    return (
      <div className="mb-16 bg-[#eb6496] text-white p-8 md:p-10 rounded-[3rem] shadow-[0_20px_40px_-15px_rgba(235,100,150,0.5)] animate-in fade-in relative overflow-hidden" style={{animationDelay: '100ms'}}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-black text-white mb-2 font-display">02. Quando você usa máscaras?</h3>
          <p className="text-white/80 font-medium mb-8">Reflita e descreva como você se comporta e por que se esconde (ou muda sua personalidade) nas seguintes situações:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {situations.map((sit, index) => (
              <div key={sit.key} className="bg-white/10 backdrop-blur-sm p-6 rounded-3xl border border-white/20 flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-[#1ed7a4] mb-3">Reflexão {index+1}</span>
                <h4 className="font-bold text-white text-base md:text-lg mb-4 leading-tight">{sit.label}</h4>
                <textarea 
                  placeholder="Seus pensamentos sobre esta máscara..."
                  value={data?.act02?.[sit.key] || ''}
                  onChange={(e) => updateData('act02', sit.key, e.target.value)}
                  className="w-full flex-1 min-h-[100px] bg-black/10 p-4 rounded-xl border border-white/10 outline-none focus:bg-white/20 focus:border-white/40 transition-colors text-sm text-white placeholder:text-white/40 resize-none font-medium mt-auto" 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <div className="mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-[#1ed7a4] uppercase tracking-tighter mb-4 font-display">Solução de Cansaço Emocional</h2>
        <p className="text-lg text-slate-500 font-medium">Você obteve um alto índice de tensão Emocional. Esta seção te ajudará a eliminar o peso da performatividade excessiva.</p>
      </div>

      {renderAct01()}
      {renderAct02()}
    </div>
  )
}
